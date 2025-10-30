# Broker Logging System

Lightweight SQLite-based logging for API calls, form submissions, and errors.

## Features

- ✅ **24-hour retention** - Auto-cleanup of old logs
- ✅ **API request/response logging** - All API calls logged automatically
- ✅ **Form submission tracking** - Detailed form submission logs with relationship status
- ✅ **Error tracking** - All errors captured with full context
- ✅ **Query endpoints** - Easy diagnosis via REST API

## Database Location

- **Path**: `broker/data/broker-logs.db`
- **Type**: SQLite (embedded, no server needed)
- **Retention**: 24 hours (auto-cleanup)

## Query Endpoints

### Get Recent API Logs
```bash
GET /api/logs/api?limit=50
```

### Get Form Submissions
```bash
GET /api/logs/submissions?limit=50
```

### Get Failed Relationships
```bash
GET /api/logs/submissions/failed-relationships?limit=50
```

### Get Errors
```bash
GET /api/logs/errors?limit=50
```

### Get Form Submissions by Form ID
```bash
GET /api/logs/submissions/form/:formId?limit=50
```

### Get Form Submission by Salesforce ID
```bash
GET /api/logs/submissions/sf/:submissionId
```

## Diagnosing Relationship Issues

### Step 1: Check Failed Relationships
```bash
curl "http://localhost:3001/api/logs/submissions/failed-relationships"
```

This returns all submissions where:
- Lead was created (`lead_id` is not null)
- But no relationship was created (`relationship_ids` is null or empty)

### Step 2: Review Submission Details

For each failed submission, check:
- `business_record_ids` - Should contain Lead ID
- `mapping_rules` - Verify conditional mappings are correct
- `form_data` - Check if all required fields are present
- `warning_message` - May contain specific error details

### Step 3: Check API Logs for Errors
```bash
curl "http://localhost:3001/api/logs/errors"
```

Look for:
- Salesforce API errors
- Relationship creation failures
- Connection issues

## Example: Debugging Relationship Issue

```bash
# 1. Get failed relationships
curl "http://localhost:3001/api/logs/submissions/failed-relationships" | jq

# 2. Get specific submission details
curl "http://localhost:3001/api/logs/submissions/sf/a0RW..." | jq

# 3. Check API logs for that form submission
curl "http://localhost:3001/api/logs/api/path/submit?limit=10" | jq
```

## Logged Data

### API Logs
- Method, path, status code
- Request/response bodies
- Duration (ms)
- Context ID, form ID
- User agent, IP address
- Error messages

### Form Submissions
- Form ID, context ID
- Submission ID (Salesforce)
- Lead ID (if created)
- Relationship IDs (if created)
- Form data (full JSON)
- Mapping rules used
- Business record IDs
- Success/failure status
- Warning/error messages
- Duration (ms)

## Auto-Cleanup

Logs older than 24 hours are automatically deleted:
- Runs on broker startup
- Runs every hour
- No manual cleanup needed

## Database Schema

### `api_logs` table
- `id`, `timestamp`, `method`, `path`, `status_code`
- `duration_ms`, `request_body`, `response_body`
- `error_message`, `context_id`, `form_id`
- `user_agent`, `ip_address`

### `form_submissions` table
- `id`, `timestamp`, `form_id`, `context_id`
- `submission_id`, `lead_id`, `relationship_ids`
- `form_data`, `mapping_rules`, `business_record_ids`
- `success`, `error_message`, `warning_message`
- `duration_ms`

## Performance

- SQLite is very fast for read queries
- All writes are asynchronous (don't block requests)
- Indexed fields: `timestamp`, `path`, `context_id`, `form_id`, `status_code`
- Minimal overhead on API responses

