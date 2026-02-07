$ErrorActionPreference = "Stop"

# Create input file for agentcore configure
$input = @"
agent
eu-west-1
anthropic.claude-3-5-sonnet-20241022-v2:0


"@

Set-Location agents/test-agent
$input | agentcore configure --entrypoint agent.py

Write-Host "Configuration complete"
