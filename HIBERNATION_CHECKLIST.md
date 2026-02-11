# Vitracka Hibernation Checklist

**Date**: February 8, 2026

---

## Before Hibernation

- [ ] 1. Commit all code changes
  ```powershell
  git add .
  git commit -m "Final commit before hibernation"
  ```

- [ ] 2. Push to remote repository
  ```powershell
  git push origin main
  ```

- [ ] 3. Run teardown script (dry run first)
  ```powershell
  ./scripts/teardown-all-resources.ps1 -DryRun
  ```

- [ ] 4. Review what will be deleted
  - Check the dry run output
  - Confirm you're okay with deletions

- [ ] 5. Run actual teardown
  ```powershell
  ./scripts/teardown-all-resources.ps1
  ```

- [ ] 6. Verify resources deleted in AWS Console
  - Bedrock: https://console.aws.amazon.com/bedrock/home?region=eu-west-1
  - CloudWatch: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1

- [ ] 7. Commit backup files
  ```powershell
  git add backups/
  git commit -m "Add hibernation backup - $(Get-Date -Format 'yyyy-MM-dd')"
  git push
  ```

- [ ] 8. Note your backup directory name
  - Example: `backups/teardown-20260208-120000`
  - Write it down or save it somewhere

---

## During Hibernation

- ✅ No AWS costs
- ✅ All code safe in Git
- ✅ Ready to wake up anytime

---

## When Waking Up

- [ ] 1. Pull latest code
  ```powershell
  git pull origin main
  ```

- [ ] 2. Find backup directory
  ```powershell
  Get-ChildItem -Path backups -Directory
  ```

- [ ] 3. Review redeployment instructions
  ```powershell
  ./scripts/redeploy-from-backup.ps1 -BackupDir backups/teardown-YYYYMMDD-HHMMSS
  ```

- [ ] 4. Deploy Coach Companion agent
  ```powershell
  cd agents/coach-companion-agentcore
  agentcore deploy
  cd ../..
  ```

- [ ] 5. Verify agent is READY
  ```powershell
  cd agents/coach-companion-agentcore
  agentcore status
  ```

- [ ] 6. Test agent invocation
  ```powershell
  agentcore invoke '{"prompt": "Hello! Are you back online?"}'
  ```

- [ ] 7. Recreate CloudWatch alarms
  ```powershell
  ./scripts/create-agentcore-alarms.ps1
  ./scripts/create-latency-alarms.ps1
  ./scripts/create-cost-alarms.ps1
  ```

- [ ] 8. Verify monitoring
  - Check CloudWatch dashboard
  - Verify alarms are active
  - Check logs are flowing

- [ ] 9. Run smoke tests
  ```powershell
  # Test basic functionality
  agentcore invoke '{"prompt": "Health check"}'
  ```

- [ ] 10. Update documentation with new agent ARNs
  - Note new agent ARN
  - Update any hardcoded references

---

## Estimated Times

- **Hibernation**: 5-10 minutes
- **Wake-up**: 15-20 minutes
- **Cost savings**: $0-5/month → $0/month

---

## Quick Reference

### Hibernate
```powershell
./scripts/teardown-all-resources.ps1
```

### Wake Up
```powershell
./scripts/redeploy-from-backup.ps1 -BackupDir backups/teardown-YYYYMMDD-HHMMSS
cd agents/coach-companion-agentcore && agentcore deploy && cd ../..
./scripts/create-agentcore-alarms.ps1
```

### Verify
```powershell
agentcore status
agentcore invoke '{"prompt": "test"}'
```

---

**Ready to hibernate!** ✅
