# Create CloudWatch Dashboard for Test Agent Monitoring

$dashboardBody = @'
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}]
        ],
        "region": "eu-west-1",
        "title": "CPU Utilization",
        "period": 300,
        "yAxis": {"left": {"min": 0, "max": 100}}
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ECS", "MemoryUtilization", {"stat": "Average"}]
        ],
        "region": "eu-west-1",
        "title": "Memory Utilization",
        "period": 300,
        "yAxis": {"left": {"min": 0, "max": 100}}
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 24,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ECS", "RunningTaskCount", {"stat": "Average"}]
        ],
        "region": "eu-west-1",
        "title": "Running Tasks",
        "period": 60
      }
    }
  ]
}
'@

Write-Host "Creating CloudWatch dashboard..."
aws cloudwatch put-dashboard --dashboard-name "test-agent-monitoring" --dashboard-body $dashboardBody

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dashboard created successfully!"
    Write-Host "View at: https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=test-agent-monitoring"
} else {
    Write-Host "Failed to create dashboard"
    exit 1
}
