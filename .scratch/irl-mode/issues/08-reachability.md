# 08: Reachability check + jump scaling

**What to build:** Every Level is winnable without fake platforms: a check simulates the Runner's jumps from Spawn to the exit and, if unreachable even with double jump, scales that Level's jump power until it is.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Desk Level passes without scaling or with logged scale factor
- [ ] Self-check: a synthetic Level with a huge gap gets scaled and becomes winnable
- [ ] Never alters Surfaces or adds Props
