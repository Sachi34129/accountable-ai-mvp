# Document Types for Testing

## ✅ Best Document Types for Testing

### 1. **Receipts** (Easiest to extract)
- ✅ Restaurant receipts
- ✅ Grocery store receipts  
- ✅ Retail purchase receipts
- ✅ Gas station receipts
- ✅ Pharmacy receipts
- ✅ Coffee shop receipts

**Why they work well:**
- Clear text
- Simple format
- Usually have date, amount, merchant name
- Good for initial testing

### 2. **Invoices**
- ✅ Utility bills (electricity, water, internet)
- ✅ Service invoices (plumber, electrician, mechanic)
- ✅ Subscription invoices (Netflix, Spotify, gym)
- ✅ Professional service invoices

**Why they work well:**
- Structured format
- Clear amounts and dates
- Good for testing categorization

### 3. **Bank/Credit Card Statements**
- ✅ Credit card statements (PDF)
- ✅ Bank account statements
- ✅ E-statements

**Why they work well:**
- Multiple transactions per document
- Good for testing bulk extraction
- Real-world use case

### 4. **Bills**
- ✅ Medical bills
- ✅ Insurance bills
- ✅ Phone bills
- ✅ Internet bills

## 📋 Document Quality Tips

### ✅ Good Documents:
- Clear, readable text
- Good lighting (for photos)
- PDF format preferred
- High resolution images
- Well-structured layout

### ❌ Avoid:
- Blurry images
- Handwritten text (unless very clear)
- Very low resolution
- Cropped/incomplete documents
- Documents with heavy shadows

## 🧪 Testing Workflow

1. **Start Simple**: Upload a clear restaurant receipt
2. **Check Extraction**: Wait 5-10 seconds, refresh dashboard
3. **Verify Data**: Check if transactions appear correctly
4. **Test Different Types**: Try invoices, bills, statements
5. **Test Edge Cases**: Blurry images, complex layouts

## 📝 Sample Test Documents

### Test Document 1: Simple Receipt
- Type: Restaurant receipt
- Format: PDF or clear photo
- Should extract: Date, amount, merchant, items

### Test Document 2: Utility Bill
- Type: Electricity bill
- Format: PDF
- Should extract: Bill date, amount, service provider

### Test Document 3: Credit Card Statement
- Type: Monthly statement
- Format: PDF
- Should extract: Multiple transactions with dates and amounts

## 🎯 Expected Results

After uploading:
1. Document appears in "Documents" list with status "pending"
2. Status changes to "processing" (worker is extracting)
3. Status changes to "completed" (extraction done)
4. Transactions appear in "Transactions" table
5. Transactions show: date, description, amount, category

## ⚠️ Common Issues

- **Status stuck on "pending"**: Worker not running - start with `npm run worker`
- **Status "failed"**: Document quality issue or OpenAI API error
- **No transactions extracted**: Document might not contain clear financial data
- **Wrong amounts**: Document might have complex formatting

## 💡 Pro Tips

1. **Use PDFs when possible** - Better OCR results
2. **Test with real documents** - More realistic testing
3. **Start with simple receipts** - Build confidence
4. **Check worker logs** - See extraction progress
5. **Refresh dashboard** - After extraction completes

