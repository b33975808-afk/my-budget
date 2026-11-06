import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

// 고객님의 데이터베이스 열쇠입니다!
const firebaseConfig = {
  apiKey: "AIzaSyB59ni2RJf1-Qgrblj03r-pPZttpUre9SM",
  authDomain: "my-budget-d1c6f.firebaseapp.com",
  databaseURL: "https://my-budget-d1c6f-default-rtdb.firebaseio.com",
  projectId: "my-budget-d1c6f",
  storageBucket: "my-budget-d1c6f.firebasestorage.app",
  messagingSenderId: "498449473274",
  appId: "1:498449473274:web:37d0d1edbc1a9741577343"
};

// 파이어베이스 실행
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [transactions, setTransactions] = useState([]);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('식비'); 
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  const expenseCategories = ['식비', '교통/차량', '주거/통신', '쇼핑/여가', '기타'];
  const incomeCategories = ['급여', '용돈', '부수입', '기타'];

  // 지출/수입 변경 시 카테고리 기본값 자동 변경
  useEffect(() => {
    if (type === 'expense') setCategory('식비');
    else setCategory('급여');
  }, [type]);

  // 클라우드 데이터베이스에서 내역 실시간으로 불러오기
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(txs);
    });
    return () => unsubscribe();
  }, []);

  // 클라우드 데이터베이스에 내역 추가하기
  const addTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    await addDoc(collection(db, "transactions"), {
      text: text || category,
      category,
      amount: parseFloat(amount),
      type,
      date: new Date().toISOString()
    });
    
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

        <form onSubmit={addTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#C5E1A5' }}>
              <option value="expense">지출</option>
              <option value="income">수입</option>
            </select>
            
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }}>
              {type === 'expense' 
                ? expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                : incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
              }
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="상세 내용 (안 적어도 됨)" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            <input type="number" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '120px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#FFD1DC', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>추가</button>
          </div>
        </form>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredTransactions.map(tx => (
            <li key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', backgroundColor: '#eee', padding: '3px 6px', borderRadius: '4px' }}>{tx.category}</span>
                <span>{tx.text}</span>
              </div>
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
