-- Migration: Auto-scaling Infrastructure Support
-- Adds tables for tracking scaling decisions, performance metrics, and infrastructure state
-- Supports Requirements 16.4, 16.5

-- Infrastructure state tracking
CREATE TABLE IF NOT EXISTS infrastructure_state (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    instance_count INTEGER NOT NULL DEFAULT 2,
    target_cpu_utilization DECIMAL(5,2) DEFAULT 70.0,
    target_memory_utilization DECIMAL(5,2) DEFAULT 80.0,
    min_instances INTEGER DEFAULT 2,
    max_instances INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System performance metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cpu_utilization DECIMAL(5,2) NOT NULL,
    memory_utilization DECIMAL(5,2) NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    error_rate DECIMAL(8,6) NOT NULL,
    active_users INTEGER DEFAULT 0,
    requests_per_second DECIMAL(10,2) DEFAULT 0,
    instance_count INTEGER DEFAULT 2,
    service_name VARCHAR(100) DEFAULT 'vitracka-main'
);

-- Auto-scaling decisions log
CREATE TABLE IF NOT EXISTS scaling_decisions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    service_name VARCHAR(100) DEFAULT 'vitracka-main',
    cpu_utilization DECIMAL(5,2) NOT NULL,
    memory_utilization DECIMAL(5,2) NOT NULL,
    response_time INTEGER NOT NULL,
    error_rate DECIMAL(8,6) NOT NULL,
    active_users INTEGER DEFAULT 0,
    current_instances INTEGER NOT NULL,
    should_scale BOOLEAN NOT NULL,
    direction VARCHAR(10) CHECK (direction IN ('up', 'down', 'none')),
    target_instances INTEGER NOT NULL,
    reason TEXT NOT NULL,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    executed BOOLEAN DEFAULT FALSE,
    execution_time INTEGER DEFAULT 0, -- in milliseconds
    success BOOLEAN DEFAULT NULL
);

-- Database query performance tracking
CREATE TABLE IF NOT EXISTS query_performance (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    execution_time DECIMAL(10,3) NOT NULL, -- in milliseconds
    rows_affected INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    optimized BOOLEAN DEFAULT FALSE,
    optimization_notes TEXT
);

-- Cache performance metrics
CREATE TABLE IF NOT EXISTS cache_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cache_type VARCHAR(50) NOT NULL, -- 'redis', 'memory', etc.
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    hit_rate DECIMAL(5,4) DEFAULT 0,
    total_keys INTEGER DEFAULT 0,
    memory_usage BIGINT DEFAULT 0, -- in bytes
    evictions INTEGER DEFAULT 0
);

-- Lambda function execution metrics
CREATE TABLE IF NOT EXISTS lambda_metrics (
    id SERIAL PRIMARY KEY,
    function_name VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER NOT NULL, -- in milliseconds
    memory_used INTEGER NOT NULL, -- in MB
    billed_duration INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    cold_start BOOLEAN DEFAULT FALSE
);

-- Cost optimization recommendations
CREATE TABLE IF NOT EXISTS cost_optimizations (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    optimization_type VARCHAR(50) NOT NULL, -- 'scaling', 'instance_type', 'caching', etc.
    current_cost DECIMAL(10,2) NOT NULL,
    projected_cost DECIMAL(10,2) NOT NULL,
    potential_savings DECIMAL(10,2) NOT NULL,
    recommendation TEXT NOT NULL,
    implementation_effort VARCHAR(20) CHECK (implementation_effort IN ('low', 'medium', 'high')),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'implemented', 'rejected')),
    implemented_at TIMESTAMP DEFAULT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scaling_decisions_timestamp ON scaling_decisions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scaling_decisions_service ON scaling_decisions(service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON query_performance(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_performance_time ON query_performance(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_timestamp ON cache_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lambda_metrics_function ON lambda_metrics(function_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cost_optimizations_status ON cost_optimizations(status, priority);

-- Insert default infrastructure state
INSERT INTO infrastructure_state (service_name, instance_count, target_cpu_utilization, target_memory_utilization, min_instances, max_instances)
VALUES 
    ('vitracka-main', 2, 70.0, 80.0, 2, 20),
    ('vitracka-agents', 2, 70.0, 80.0, 2, 10),
    ('vitracka-lambda', 0, 0, 0, 0, 1000)
ON CONFLICT (service_name) DO NOTHING;

-- Function to update infrastructure state timestamp
CREATE OR REPLACE FUNCTION update_infrastructure_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamp
DROP TRIGGER IF EXISTS trigger_update_infrastructure_state_timestamp ON infrastructure_state;
CREATE TRIGGER trigger_update_infrastructure_state_timestamp
    BEFORE UPDATE ON infrastructure_state
    FOR EACH ROW
    EXECUTE FUNCTION update_infrastructure_state_timestamp();

-- Function to calculate cache hit rate
CREATE OR REPLACE FUNCTION calculate_cache_hit_rate(hit_count INTEGER, miss_count INTEGER)
RETURNS DECIMAL(5,4) AS $$
BEGIN
    IF (hit_count + miss_count) = 0 THEN
        RETURN 0;
    END IF;
    RETURN hit_count::DECIMAL / (hit_count + miss_count)::DECIMAL;
END;
$$ LANGUAGE plpgsql;

-- View for recent performance metrics
CREATE OR REPLACE VIEW recent_performance_metrics AS
SELECT 
    timestamp,
    cpu_utilization,
    memory_utilization,
    response_time,
    error_rate,
    active_users,
    requests_per_second,
    instance_count,
    service_name
FROM system_metrics 
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- View for scaling decision summary
CREATE OR REPLACE VIEW scaling_decision_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    service_name,
    COUNT(*) as total_decisions,
    COUNT(CASE WHEN should_scale = true THEN 1 END) as scale_decisions,
    COUNT(CASE WHEN direction = 'up' THEN 1 END) as scale_up_count,
    COUNT(CASE WHEN direction = 'down' THEN 1 END) as scale_down_count,
    AVG(target_instances) as avg_target_instances,
    AVG(estimated_cost) as avg_estimated_cost
FROM scaling_decisions 
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), service_name
ORDER BY hour DESC;

-- View for query performance analysis
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query_hash,
    query_text,
    COUNT(*) as execution_count,
    AVG(execution_time) as avg_execution_time,
    MAX(execution_time) as max_execution_time,
    MIN(execution_time) as min_execution_time,
    optimized
FROM query_performance 
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY query_hash, query_text, optimized
HAVING AVG(execution_time) > 1000 -- Queries taking more than 1 second on average
ORDER BY avg_execution_time DESC;

-- View for cost optimization opportunities
CREATE OR REPLACE VIEW cost_optimization_opportunities AS
SELECT 
    optimization_type,
    COUNT(*) as opportunity_count,
    SUM(potential_savings) as total_potential_savings,
    AVG(potential_savings) as avg_potential_savings,
    COUNT(CASE WHEN priority = 'high' OR priority = 'critical' THEN 1 END) as high_priority_count
FROM cost_optimizations 
WHERE status = 'pending'
GROUP BY optimization_type
ORDER BY total_potential_savings DESC;

COMMENT ON TABLE infrastructure_state IS 'Tracks current state and configuration of infrastructure services';
COMMENT ON TABLE system_metrics IS 'Stores system performance metrics for auto-scaling decisions';
COMMENT ON TABLE scaling_decisions IS 'Logs all auto-scaling decisions and their outcomes';
COMMENT ON TABLE query_performance IS 'Tracks database query performance for optimization';
COMMENT ON TABLE cache_metrics IS 'Monitors cache performance and hit rates';
COMMENT ON TABLE lambda_metrics IS 'Tracks Lambda function execution metrics';
COMMENT ON TABLE cost_optimizations IS 'Stores cost optimization recommendations and their status';