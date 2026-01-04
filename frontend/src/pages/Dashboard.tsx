import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Document {
  id: string;
  type: string;
  mimeType: string;
  extractionStatus: string;
  extractionProgress: number;
  extractedAt: string | null;
  createdAt: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string | null;
  direction: string;
  category: string | null;
}

function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      navigate('/login');
      return;
    }
    setUserId(storedUserId);
    fetchDocuments();
    fetchTransactions();
  }, [navigate]);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.delete(`/documents/${documentId}`);
      // Refresh documents and transactions
      fetchDocuments();
      fetchTransactions();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      alert(`Failed to delete document: ${error.response?.data?.error || error.message}`);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', 'receipt'); // or 'invoice', 'statement', etc.

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert(`Document uploaded! ID: ${response.data.documentId}\nStatus: ${response.data.extractionStatus}`);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh after a delay to see extraction results
      setTimeout(() => {
        fetchDocuments();
        fetchTransactions();
      }, 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!userId || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Accountable AI Dashboard</h1>
        <button 
          onClick={() => {
            localStorage.removeItem('userId');
            navigate('/login');
          }}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* Upload Section */}
      <div style={{ 
        border: '2px dashed #ccc', 
        borderRadius: '8px', 
        padding: '2rem', 
        marginBottom: '2rem',
        backgroundColor: '#f9f9f9'
      }}>
        <h2>Upload Financial Document</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Upload receipts, invoices, bank statements, or bills (PDF, JPG, PNG)
        </p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            style={{ padding: '0.5rem' }}
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: uploading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        {selectedFile && (
          <p style={{ marginTop: '0.5rem', color: '#666' }}>
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {/* Documents List */}
      <div style={{ marginBottom: '2rem' }}>
        <h2>Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p style={{ color: '#666' }}>No documents uploaded yet. Upload one above to get started!</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {documents.map((doc) => (
              <div key={doc.id} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                padding: '1rem',
                backgroundColor: 'white',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <strong>{doc.type}</strong>
                      <span style={{ color: '#666', fontSize: '0.875rem' }}>{doc.mimeType}</span>
                    </div>
                    {doc.extractionStatus === 'processing' && (
                      <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          backgroundColor: '#e0e0e0', 
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${doc.extractionProgress || 0}%`,
                            height: '100%',
                            backgroundColor: '#4CAF50',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                          Processing: {Math.round(doc.extractionProgress || 0)}%
                        </p>
                      </div>
                    )}
                    {doc.extractedAt && (
                      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                        Extracted: {new Date(doc.extractedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: 
                        doc.extractionStatus === 'completed' ? '#4CAF50' :
                        doc.extractionStatus === 'processing' ? '#FF9800' :
                        doc.extractionStatus === 'failed' ? '#f44336' : '#ccc',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}>
                      {doc.extractionStatus}
                    </span>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div>
        <h2>Transactions ({transactions.length})</h2>
        {transactions.length === 0 ? (
          <p style={{ color: '#666' }}>No transactions found. Upload documents to extract transactions!</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Merchant</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Amount</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Category</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>{new Date(tx.date).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>{tx.description}</td>
                    <td style={{ padding: '0.75rem' }}>{tx.merchant || '-'}</td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right',
                      color: tx.direction === 'income' ? '#4CAF50' : '#f44336'
                    }}>
                      {tx.direction === 'income' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{tx.category || 'Uncategorized'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
