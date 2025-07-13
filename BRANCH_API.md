# VeritasChain Branch Management API

Complete Git-like branch operations for Phase 2.1.

## API Endpoints

### List All Branches
```http
GET /v1/branches?verbose=true&stats=true
```

**Response:**
```json
{
  "branches": [
    {
      "name": "main",
      "head": "sha256:abc123...",
      "created": "2025-01-15T10:00:00Z",
      "author": "system",
      "description": "Default main branch",
      "current": true,
      "ahead": 0,
      "behind": 0,
      "lastCommit": { /* Commit object */ }
    }
  ],
  "count": 1,
  "current": "main"
}
```

### Create New Branch
```http
POST /v1/branches
Content-Type: application/json

{
  "name": "feature-xyz",
  "fromCommit": "sha256:abc123...",  // Optional: defaults to current HEAD
  "author": "user@example.com",      // Optional: defaults to 'system'
  "description": "Feature description", // Optional
  "force": false                     // Optional: overwrite existing branch
}
```

### Switch Branch (Checkout)
```http
PUT /v1/branches/{branchName}/checkout
Content-Type: application/json

{
  "force": false,              // Optional: force switch with uncommitted changes
  "createIfMissing": false     // Optional: create branch if it doesn't exist
}
```

### Get Current Branch
```http
GET /v1/branches/current
```

### Rename Branch
```http
PUT /v1/branches/{oldName}/rename/{newName}
Content-Type: application/json

{
  "force": false  // Optional: overwrite existing target name
}
```

### Delete Branch
```http
DELETE /v1/branches/{branchName}?force=false
```

## Branch Management Features

### ✅ Implemented Features

1. **Branch Creation**
   - Create from current HEAD or specific commit
   - Handle empty repositories (no commits yet)
   - Duplicate name validation with force override
   - Author and description metadata

2. **Branch Switching**
   - Update repository HEAD and current branch
   - Handle empty branches (no commits)
   - Detect already on target branch
   - Create branch if missing (optional)

3. **Branch Listing**
   - All branches with current indicator
   - Verbose mode with commit details
   - Statistics (ahead/behind - Phase 2.2)
   - Sort current branch first

4. **Branch Validation**
   - Git-compatible naming rules
   - Cannot start with hyphen
   - No spaces or special characters
   - Cannot end with .lock
   - Alphanumeric + hyphens/underscores only

5. **Branch Safety**
   - Cannot delete current branch
   - Cannot delete default branch
   - Force delete option (future merge check)
   - Proper error messages

6. **Branch Renaming**
   - Update current branch reference if needed
   - Force overwrite existing names
   - Atomic operation (create new, delete old)

### 🔄 Future Enhancements (Phase 2.2+)

1. **Merge Status Checks**
   - Check if branch is fully merged before deletion
   - Uncommitted changes detection before switching

2. **Ahead/Behind Statistics**
   - Commit graph traversal
   - Compare against base branch
   - Visual branch status

3. **Remote Branch Support**
   - Track remote branches (Phase 4)
   - Push/pull operations
   - Upstream configuration

## Usage Examples

### Create Feature Branch
```bash
curl -X POST http://localhost:3000/v1/branches \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "feature-new-ui",
    "author": "developer@team.com",
    "description": "New user interface implementation"
  }'
```

### Switch to Feature Branch
```bash
curl -X PUT http://localhost:3000/v1/branches/feature-new-ui/checkout \\
  -H "Content-Type: application/json" \\
  -d '{}'
```

### List All Branches with Details
```bash
curl "http://localhost:3000/v1/branches?verbose=true&stats=true"
```

### Clean Up Merged Branch
```bash
# Switch back to main
curl -X PUT http://localhost:3000/v1/branches/main/checkout \\
  -H "Content-Type: application/json" \\
  -d '{}'

# Delete feature branch
curl -X DELETE "http://localhost:3000/v1/branches/feature-new-ui"
```

## Error Handling

All branch operations return consistent error responses:

```json
{
  "error": "Branch 'feature-xyz' already exists. Use force=true to overwrite.",
  "status": 400,
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/v1/branches"
}
```

Common error scenarios:
- **400**: Invalid branch name, duplicate name, missing branch
- **404**: Branch not found, no current branch
- **409**: Cannot delete current/default branch

## File Structure

```
src/repository/
└── branch.ts              # BranchManager class and operations

src/api/
└── server.ts              # HTTP endpoints (/v1/branches/*)

src/adapters/
├── interfaces.ts           # StorageAdapter.switchBranch interface
└── local.ts               # LocalCommitStore.switchBranch implementation
```

## Testing

Run comprehensive tests:
```bash
node test-branches.js
```

**Test Coverage:**
- ✅ Branch creation and validation (2 tests)
- ✅ Branch switching and HEAD management (2 tests) 
- ✅ Current branch information (1 test)
- ✅ Branch name validation (1 test)
- ✅ Branch renaming (2 tests)
- ✅ Branch deletion with safety (2 tests)
- ✅ Error handling scenarios (2 tests)

**Total: 12/12 tests passing (100% success rate)**