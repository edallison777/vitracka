/**
 * ECS Fargate Configuration for Compute-Intensive Agent Workloads
 * Handles scaling of AI agent processing tasks
 * Implements Requirements 16.4, 16.5
 */

export interface FargateTaskDefinition {
    family: string;
    cpu: string;
    memory: string;
    networkMode: 'awsvpc';
    requiresCompatibilities: ['FARGATE'];
    executionRoleArn: string;
    taskRoleArn: string;
    containerDefinitions: ContainerDefinition[];
}

export interface ContainerDefinition {
    name: string;
    image: string;
    cpu: number;
    memory: number;
    essential: boolean;
    portMappings: PortMapping[];
    environment: EnvironmentVariable[];
    logConfiguration: LogConfiguration;
}

export interface PortMapping {
    containerPort: number;
    protocol: 'tcp' | 'udp';
}

export interface EnvironmentVariable {
    name: string;
    value: string;
}

export interface LogConfiguration {
    logDriver: 'awslogs';
    options: {
        'awslogs-group': string;
        'awslogs-region': string;
        'awslogs-stream-prefix': string;
    };
}

export interface FargateServiceConfig {
    serviceName: string;
    cluster: string;
    taskDefinition: string;
    desiredCount: number;
    launchType: 'FARGATE';
    networkConfiguration: NetworkConfiguration;
    loadBalancers?: LoadBalancer[];
    serviceRegistries?: ServiceRegistry[];
}

export interface NetworkConfiguration {
    awsvpcConfiguration: {
        subnets: string[];
        securityGroups: string[];
        assignPublicIp: 'ENABLED' | 'DISABLED';
    };
}

export interface LoadBalancer {
    targetGroupArn: string;
    containerName: string;
    containerPort: number;
}

export interface ServiceRegistry {
    registryArn: string;
    containerName: string;
    containerPort: number;
}

export class ECSFargateManager {
    private clusterName: string;
    private region: string;

    constructor(clusterName: string = 'vitracka-agents', region: string = 'eu-west-2') {
        this.clusterName = clusterName;
        this.region = region;
    }

    /**
     * Create task definition for AI agent workloads
     */
    createAgentTaskDefinition(): FargateTaskDefinition {
        return {
            family: 'vitracka-ai-agents',
            cpu: '1024', // 1 vCPU
            memory: '2048', // 2 GB
            networkMode: 'awsvpc',
            requiresCompatibilities: ['FARGATE'],
            executionRoleArn: 'arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole',
            taskRoleArn: 'arn:aws:iam::ACCOUNT:role/ecsTaskRole',
            containerDefinitions: [
                {
                    name: 'safety-sentinel',
                    image: 'vitracka/safety-sentinel:latest',
                    cpu: 256,
                    memory: 512,
                    essential: true,
                    portMappings: [
                        {
                            containerPort: 3001,
                            protocol: 'tcp'
                        }
                    ],
                    environment: [
                        { name: 'NODE_ENV', value: 'production' },
                        { name: 'AGENT_TYPE', value: 'safety-sentinel' },
                        { name: 'AWS_REGION', value: this.region }
                    ],
                    logConfiguration: {
                        logDriver: 'awslogs',
                        options: {
                            'awslogs-group': '/ecs/vitracka-agents',
                            'awslogs-region': this.region,
                            'awslogs-stream-prefix': 'safety-sentinel'
                        }
                    }
                },
                {
                    name: 'coach-companion',
                    image: 'vitracka/coach-companion:latest',
                    cpu: 256,
                    memory: 512,
                    essential: true,
                    portMappings: [
                        {
                            containerPort: 3002,
                            protocol: 'tcp'
                        }
                    ],
                    environment: [
                        { name: 'NODE_ENV', value: 'production' },
                        { name: 'AGENT_TYPE', value: 'coach-companion' },
                        { name: 'AWS_REGION', value: this.region }
                    ],
                    logConfiguration: {
                        logDriver: 'awslogs',
                        options: {
                            'awslogs-group': '/ecs/vitracka-agents',
                            'awslogs-region': this.region,
                            'awslogs-stream-prefix': 'coach-companion'
                        }
                    }
                },
                {
                    name: 'concierge-orchestrator',
                    image: 'vitracka/concierge-orchestrator:latest',
                    cpu: 512,
                    memory: 1024,
                    essential: true,
                    portMappings: [
                        {
                            containerPort: 3000,
                            protocol: 'tcp'
                        }
                    ],
                    environment: [
                        { name: 'NODE_ENV', value: 'production' },
                        { name: 'AGENT_TYPE', value: 'concierge-orchestrator' },
                        { name: 'AWS_REGION', value: this.region }
                    ],
                    logConfiguration: {
                        logDriver: 'awslogs',
                        options: {
                            'awslogs-group': '/ecs/vitracka-agents',
                            'awslogs-region': this.region,
                            'awslogs-stream-prefix': 'concierge-orchestrator'
                        }
                    }
                }
            ]
        };
    }

    /**
     * Create service configuration for agent workloads
     */
    createAgentServiceConfig(
        subnets: string[],
        securityGroups: string[],
        targetGroupArn?: string
    ): FargateServiceConfig {
        const serviceConfig: FargateServiceConfig = {
            serviceName: 'vitracka-ai-agents',
            cluster: this.clusterName,
            taskDefinition: 'vitracka-ai-agents',
            desiredCount: 2, // Start with 2 tasks for high availability
            launchType: 'FARGATE',
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets,
                    securityGroups,
                    assignPublicIp: 'DISABLED' // Private subnets
                }
            }
        };

        // Add load balancer if target group is provided
        if (targetGroupArn) {
            serviceConfig.loadBalancers = [
                {
                    targetGroupArn,
                    containerName: 'concierge-orchestrator',
                    containerPort: 3000
                }
            ];
        }

        return serviceConfig;
    }

    /**
     * Create auto-scaling configuration for ECS service
     */
    createAutoScalingConfig() {
        return {
            serviceNamespace: 'ecs',
            resourceId: `service/${this.clusterName}/vitracka-ai-agents`,
            scalableDimension: 'ecs:service:DesiredCount',
            minCapacity: 2,
            maxCapacity: 20,
            targetTrackingScalingPolicies: [
                {
                    policyName: 'cpu-scaling-policy',
                    targetValue: 70.0,
                    metricType: 'ECSServiceAverageCPUUtilization',
                    scaleOutCooldown: 300, // 5 minutes
                    scaleInCooldown: 300
                },
                {
                    policyName: 'memory-scaling-policy',
                    targetValue: 80.0,
                    metricType: 'ECSServiceAverageMemoryUtilization',
                    scaleOutCooldown: 300,
                    scaleInCooldown: 300
                }
            ],
            stepScalingPolicies: [
                {
                    policyName: 'request-count-scaling-policy',
                    adjustmentType: 'ChangeInCapacity',
                    stepAdjustments: [
                        {
                            metricIntervalLowerBound: 0,
                            metricIntervalUpperBound: 50,
                            scalingAdjustment: 1
                        },
                        {
                            metricIntervalLowerBound: 50,
                            scalingAdjustment: 2
                        }
                    ],
                    metricAggregationType: 'Average',
                    cooldown: 300
                }
            ]
        };
    }

    /**
     * Create CloudWatch alarms for monitoring
     */
    createCloudWatchAlarms() {
        return [
            {
                alarmName: 'vitracka-agents-high-cpu',
                alarmDescription: 'High CPU utilization on Vitracka AI agents',
                metricName: 'CPUUtilization',
                namespace: 'AWS/ECS',
                statistic: 'Average',
                period: 300,
                evaluationPeriods: 2,
                threshold: 80,
                comparisonOperator: 'GreaterThanThreshold',
                dimensions: [
                    {
                        name: 'ServiceName',
                        value: 'vitracka-ai-agents'
                    },
                    {
                        name: 'ClusterName',
                        value: this.clusterName
                    }
                ],
                alarmActions: [
                    'arn:aws:sns:eu-west-2:ACCOUNT:vitracka-alerts'
                ]
            },
            {
                alarmName: 'vitracka-agents-high-memory',
                alarmDescription: 'High memory utilization on Vitracka AI agents',
                metricName: 'MemoryUtilization',
                namespace: 'AWS/ECS',
                statistic: 'Average',
                period: 300,
                evaluationPeriods: 2,
                threshold: 85,
                comparisonOperator: 'GreaterThanThreshold',
                dimensions: [
                    {
                        name: 'ServiceName',
                        value: 'vitracka-ai-agents'
                    },
                    {
                        name: 'ClusterName',
                        value: this.clusterName
                    }
                ],
                alarmActions: [
                    'arn:aws:sns:eu-west-2:ACCOUNT:vitracka-alerts'
                ]
            },
            {
                alarmName: 'vitracka-agents-task-count-low',
                alarmDescription: 'Low task count for Vitracka AI agents',
                metricName: 'RunningTaskCount',
                namespace: 'AWS/ECS',
                statistic: 'Average',
                period: 300,
                evaluationPeriods: 1,
                threshold: 1,
                comparisonOperator: 'LessThanThreshold',
                dimensions: [
                    {
                        name: 'ServiceName',
                        value: 'vitracka-ai-agents'
                    },
                    {
                        name: 'ClusterName',
                        value: this.clusterName
                    }
                ],
                alarmActions: [
                    'arn:aws:sns:eu-west-2:ACCOUNT:vitracka-critical-alerts'
                ]
            }
        ];
    }

    /**
     * Generate Terraform configuration for ECS Fargate setup
     */
    generateTerraformConfig(): string {
        return `
# ECS Cluster for AI Agents
resource "aws_ecs_cluster" "vitracka_agents" {
  name = "${this.clusterName}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "Vitracka AI Agents Cluster"
    Environment = var.environment
    Project     = "vitracka"
  }
}

# Task Definition
resource "aws_ecs_task_definition" "vitracka_agents" {
  family                   = "vitracka-ai-agents"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "concierge-orchestrator"
      image     = "vitracka/concierge-orchestrator:latest"
      cpu       = 512
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "AGENT_TYPE"
          value = "concierge-orchestrator"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/vitracka-agents"
          "awslogs-region"        = "${this.region}"
          "awslogs-stream-prefix" = "concierge-orchestrator"
        }
      }
    },
    {
      name      = "safety-sentinel"
      image     = "vitracka/safety-sentinel:latest"
      cpu       = 256
      memory    = 512
      essential = true

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "AGENT_TYPE"
          value = "safety-sentinel"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/vitracka-agents"
          "awslogs-region"        = "${this.region}"
          "awslogs-stream-prefix" = "safety-sentinel"
        }
      }
    }
  ])

  tags = {
    Name        = "Vitracka AI Agents Task Definition"
    Environment = var.environment
    Project     = "vitracka"
  }
}

# ECS Service
resource "aws_ecs_service" "vitracka_agents" {
  name            = "vitracka-ai-agents"
  cluster         = aws_ecs_cluster.vitracka_agents.id
  task_definition = aws_ecs_task_definition.vitracka_agents.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.vitracka_agents.arn
    container_name   = "concierge-orchestrator"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.vitracka_agents]

  tags = {
    Name        = "Vitracka AI Agents Service"
    Environment = var.environment
    Project     = "vitracka"
  }
}

# Auto Scaling Target
resource "aws_appautoscaling_target" "vitracka_agents" {
  max_capacity       = 20
  min_capacity       = 2
  resource_id        = "service/\${aws_ecs_cluster.vitracka_agents.name}/\${aws_ecs_service.vitracka_agents.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - CPU
resource "aws_appautoscaling_policy" "vitracka_agents_cpu" {
  name               = "vitracka-agents-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.vitracka_agents.resource_id
  scalable_dimension = aws_appautoscaling_target.vitracka_agents.scalable_dimension
  service_namespace  = aws_appautoscaling_target.vitracka_agents.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

# Auto Scaling Policy - Memory
resource "aws_appautoscaling_policy" "vitracka_agents_memory" {
  name               = "vitracka-agents-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.vitracka_agents.resource_id
  scalable_dimension = aws_appautoscaling_target.vitracka_agents.scalable_dimension
  service_namespace  = aws_appautoscaling_target.vitracka_agents.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}
`;
    }
}

export default ECSFargateManager;