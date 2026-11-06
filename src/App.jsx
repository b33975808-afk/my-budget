import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAVN3D5bM7KfUA-jbuF1fiYd7k-soFPA_4",
  authDomain: "my-budget-653b3.firebaseapp.com",
  databaseURL: "https://my-budget-653b3-default-rtdb.firebaseio.com",
  projectId: "my-budget-653b3",
  storageBucket: "my-budget-653b3.firebasestorage.app",
  messagingSenderId: "249976257356",
  appId: "1:249976257356:web:ec82b1bba31ccb45866de9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function App() {
  const [transactions, setTransactions] = useState([]);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('식비'); 
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isAllView, setIsAllView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체'); // 카테고리 필터 상태

  const expenseCategories = ['식비', '교통/차량', '주거/통신', '쇼핑/여가', '기타'];
  const incomeCategories = ['급여', '용돈', '부수입', '기타'];

  useEffect(() => {
    if (type === 'expense') setCategory('식비');
    else setCategory('급여');
  }, [type]);

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

  const deleteTransaction = async (id) => {
    await deleteDoc(doc(db, "transactions", id));
  };

  // 1단계: 월별 또는 전체 기간 필터링
  let filteredTransactions = isAllView 
    ? transactions 
    : transactions.filter(tx => tx.date.startsWith(currentMonth));

  // 2단계: 선택한 카테고리 필터링 (전체가 아닐 경우 해당 카테고리만 추출)
  if (selectedCategory !== '전체') {
    filteredTransactions = filteredTransactions.filter(tx => tx.category === selectedCategory);
  }
  
  const income = filteredTransactions.filter(tx => tx.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const expense = filteredTransactions.filter(tx => tx.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = income - expense;

  return (
    <div style={{ fontFamily: '맑은 고딕, sans-serif', padding: '30px', maxWidth: '700px', margin: '0 auto', backgroundColor: '#f4f5f7', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* 타이틀 & 기간 선택 */}
        <div style={{ backgroundColor: '#107c41', color: '#fff', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span>📊 나만의 가계부</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="month" 
              value={currentMonth} 
              disabled={isAllView}
              onChange={(e) => setCurrentMonth(e.target.value)} 
              style={{ padding: '5px 10px', borderRadius: '3px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: isAllView ? '#e5e7eb' : '#fff', color: '#333' }}
            />
            <button 
              onClick={() => setIsAllView(!isAllView)}
              style={{ padding: '6px 12px', backgroundColor: isAllView ? '#047857' : '#ffffff', color: isAllView ? '#fff' : '#107c41', border: '1px solid #fff', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              {isAllView ? '전체 보기 중 🔍' : '전체 보기'}
            </button>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {/* 요약 카드 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', backgroundColor: '#f8f9fa', border: '1px solid #e5e7eb', padding: '15px', borderRadius: '4px' }}>
            <div>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>총 수입</span>
              <p style={{ color: '#047857', margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>+{income.toLocaleString()}원</p>
            </div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>총 지출</span>
              <p style={{ color: '#dc2626', margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>-{expense.toLocaleString()}원</p>
            </div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>잔액</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: balance >= 0 ? '#1f2937' : '#dc2626' }}>{balance.toLocaleString()}원</p>
            </div>
          </div>

          {/* 항목별 조회 필터 바 */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f9fafb', padding: '10px 15px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>🔍 항목별 모아보기:</span>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '14px', flex: 1, backgroundColor: '#fff' }}
            >
              <option value="전체">모든 항목 (전체 보기)</option>
              <optgroup label="--- 지출 항목 ---">
                {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </optgroup>
              <optgroup label="--- 수입 항목 ---">
                {incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </optgroup>
            </select>
          </div>

          {/* 입력 폼 */}
          <form onSubmit={addTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px', backgroundColor: '#f9fafb', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                <option value="expense">지출</option>
                <option value="income">수입</option>
              </select>
              
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', flex: 1, fontSize: '14px' }}>
                {type === 'expense' 
                  ? expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                  : incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                }
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="상세 내용 입력" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '14px' }} />
              <input type="number" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '130px', padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '14px' }} />
              <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#107c41', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>추가</button>
            </div>
          </form>

          {/* 내역 리스트 테이블 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db', color: '#374151' }}>
                <th style={{ padding: '10px', width: '20%' }}>분류</th>
                <th style={{ padding: '10px', width: '45%' }}>내용</th>
                <th style={{ padding: '10px', width: '25%', textAlign: 'right' }}>금액</th>
                <th style={{ padding: '10px', width: '10%', textAlign: 'center' }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>내역이 없습니다.</td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '11px', backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', color: '#374151', fontWeight: 'bold' }}>{tx.category}</span>
                    </td>
                    <td style={{ padding: '10px', color: '#1f2937' }}>{tx.text}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'income' ? '#047857' : '#dc2626' }}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}원
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button 
                        onClick={() => deleteTransaction(tx.id)} 
                        style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #f87171', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}
export default App;
