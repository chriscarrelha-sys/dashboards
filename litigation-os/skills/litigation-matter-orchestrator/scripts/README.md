# Orchestrator scripts

The orchestrator uses the shared validators rather than carrying its own copies,
so there is one implementation to keep correct:

```bash
# structure, control fields, source-manifest integrity, originals unchanged
python3 litigation-os/tools/validate_matter_pack.py <pack> --hash-check

# assignment and result schema conformance
python3 litigation-os/tools/validate_handoff.py --dir <pack>/10-specialist-results

# deadline, research, and evidence register discipline
python3 litigation-os/tools/validate_registers.py <pack>
```

Run the first before issuing any assignment, the second before issuing and again
on every returned result, and the third before writing the consolidated report.
