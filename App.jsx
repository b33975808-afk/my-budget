
import React, { useState, useEffect } from 'react';

function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('budget_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    localStorage.setItem('budget_data', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (e) => {
    e.preventDefault();
    if (!text || !amount) return;
    const newTx = {
      id: Date.now(),
      text,
      amount: parseFloat(amount),
      type,
      date: new Date().toISOString()
    };
    setTransactions([newTx, ...transactions]);
    setText('');
    setAmount('');
  };

  const filteredTransactions = transactions.filter(tx => tx.date.startsWith(currentMonth));
  
  const income = filteredTransactions.filter(tx => tx.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const expense = filteredTransactions.filter(tx => tx.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = income - expense;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto', backgroundColor: '#B3E5FC', minHeight: '100vh', borderRadius: '15px' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', color: '#333' }}>나만의 가계부</h1>
        
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <input 
            type="month" 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)} 
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', backgroundColor: '#E1BEE7' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', backgroundColor: '#FFE0B2', padding: '15px', borderRadius: '10px' }}>
          <div>
            <h4>수입</h4>
            <p style={{ color: 'blue', margin: 0, fontWeight: 'bold' }}>+{income.toLocaleString()}원</p>
          </div>
          <div>
            <h4>지출</h4>
            <p style={{ color: 'red', margin: 0, fontWeight: 'bold' }}>-{expense.toLocaleString()}원</p>
          </div>
          <div>
            <h4>잔액</h4>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{balance.toLocaleString()}원</p>
          </div>
        </div>

        <form onSubmit={addTransaction} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#C5E1A5' }}>
            <option value="expense">지출</option>
            <option value="income">수입</option>
          </select>
          <input type="text" placeholder="내용" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
          <input type="number" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
          <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#FFD1DC', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>추가</button>
        </form>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredTransactions.map(tx => (
            <li key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
              <span>{tx.text}</span>
              <span style={{ color: tx.type === 'income' ? 'blue' : 'red', fontWeight: 'bold' }}>
                {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}원
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
export default App;
