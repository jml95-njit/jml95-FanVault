# FanVault Security Configuration (Phase 1)

## Network: FanVault-VLAN (192.168.10.0/24)

| Machine | Internal IP | Roles Allowed | From Source |
| :--- | :--- | :--- | :--- |
| **Front-End** | .10 | 22 (SSH), 4200 (Angular) | Anywhere |
| **Backend** | .20 | 22 (SSH), 3000 (API) | 192.168.10.10 |
| **Database** | .30 | 22 (SSH), 27017 (Mongo) | 192.168.10.10, 192.168.10.20 |

**Default Policy:** Deny All Incoming
