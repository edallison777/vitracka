# Disable Old GitHub Workflows
# Date: February 8, 2026
# Purpose: Disable ECS/Fargate workflows after pivot to AgentCore

Write-Host "Disabling old GitHub workflows..."
Write-Host ""

# Rename workflows to .disabled
$workflows = @(
    ".github/workflows/blue-green-deployment.yml",
    ".github/workflows/infrastructure-monitoring.yml",
    ".github/workflows/terraform-ci.yml"
)

foreach ($workflow in $workflows) {
    if (Test-Path $workflow) {
        $newName = "$workflow.disabled"
        Move-Item $workflow $newName -Force
        Write-Host "[OK] Disabled: $workflow"
    } else {
        Write-Host "[SKIP] Not found: $workflow"
    }
}

Write-Host ""
Write-Host "Old workflows disabled successfully!"
Write-Host ""
Write-Host "These workflows were for the old ECS/Fargate infrastructure."
Write-Host "The project now uses AgentCore (serverless) which doesn't need these workflows."
Write-Host ""
Write-Host "To re-enable a workflow, rename it back to .yml extension."
