# How to View Logs

## Quick Commands

### View All Logs (Combined)
```bash
cd backend
tail -f logs/combined.log
```

### View Only Errors
```bash
cd backend
tail -f logs/error.log
```

### View Last 50 Lines
```bash
cd backend
tail -50 logs/combined.log
```

### Search for Specific Terms
```bash
cd backend
grep -i "extraction\|worker\|upload" logs/combined.log | tail -20
```

## Real-time Log Monitoring

### Watch Logs in Real-time
```bash
cd backend
tail -f logs/combined.log
```
Press `Ctrl+C` to stop

### Watch Errors Only
```bash
cd backend
tail -f logs/error.log
```

## Starting the Worker

The extraction worker needs to be running in a **separate terminal**:

```bash
cd backend
npm run worker
```

You should see:
```
Extraction worker started
```

When a document is uploaded, you'll see:
```
Processing extraction job for document [id]
Starting extraction for document [id]
Extraction completed for document [id], created X transactions
```

## Troubleshooting

### Worker Not Processing Jobs
1. Check if worker is running: `ps aux | grep extractor`
2. Check Redis: `redis-cli ping` (should return PONG)
3. Check worker logs in the terminal where you ran `npm run worker`

### Server Not Showing Documents
1. Restart the server (stop with Ctrl+C, then `npm run dev`)
2. Check error logs: `tail -20 logs/error.log`
3. Verify Prisma client is regenerated: `npm run prisma:generate`

### Upload Works But Status Stays Pending
1. Make sure worker is running: `npm run worker` in separate terminal
2. Check Redis is running: `redis-cli ping`
3. Check worker terminal for errors

