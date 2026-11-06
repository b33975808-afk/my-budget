import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

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

// 오늘 날짜 구하기 (YYYY-MM-DD 형식)
const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function App() {
  const [transactions, setTransactions] = useState([]);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('식비'); 
  const [inputDate, setInputDate] = useState(getTodayDate()); // 정확한 날짜 선택
  const [currentMonth, setCurrentMonth] = useState(getTodayDate().slice(0, 7));
  
  const [isAllView, setIsAllView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [editId, setEditId] = useState(null); // 수정 모드 상태

  const expenseCategories = ['식비', '교통/차량', '주거/통신', '쇼핑/여가', '기타'];
  const incomeCategories = ['급여', '용돈', '부수입', '기타'];
  
  // 파이 차트 색상 매핑
  const expenseColors = { '식비': '#FF6B6B', '교통/차량': '#4ECDC4', '주거/통신': '#45B7D1', '쇼핑/여가': '#F9D56E', '기타': '#FF8C94' };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setType(newType);
    setCategory(newType === 'expense' ? '식비' : '급여');
  };

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
    });
    return () => unsubscribe();
  }, []);

  // 1. 추가 및 수정 기능 (통합)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !category || !inputDate) return;
    
    const txData = {
      text: text || category,
      category,
      amount: parseFloat(amount),
      type,
      date: inputDate // 직접 지정한 날짜로 저장
    };

    if (editId) {
      await updateDoc(doc(db, "transactions", editId), txData);
      setEditId(null);
    } else {
      await addDoc(collection(db, "transactions"), txData);
    }
    
    setText('');
    setAmount('');
  };

  // 2. 삭제 기능
  const deleteTransaction = async (id) => {
    if(window.confirm('정말 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, "transactions", id));
    }
  };

  // 3. 수정 모드 진입 기능
  const handleEdit = (tx) => {
    setEditId(tx.id);
    setType(tx.type);
    setCategory(tx.category);
    setText(tx.text);
    setAmount(tx.amount);
    setInputDate(tx.date);
    // 수정하는 항목의 날짜에 맞게 월 필터도 자동으로 이동
    if(!isAllView) setCurrentMonth(tx.date.slice(0, 7));
  };

  // 4. 엑셀(CSV) 저장 기능
  const exportToCSV = () => {
    const headers = ['날짜', '구분', '분류', '내용', '금액(원)'];
    const csvData = displayedTransactions.map(tx => 
      `${tx.date},${tx.type === 'income' ? '수입' : '지출'},${tx.category},"${tx.text}",${tx.amount}`
    );
    const bom = '\uFEFF'; // 한글 깨짐 방지
    const csvContent = bom + headers.join(',') + '\n' + csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `가계부_내역_${isAllView ? '전체' : currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 데이터 필터링
  let displayedTransactions = isAllView ? transactions : transactions.filter(tx => tx.date.startsWith(currentMonth));
  if (selectedCategory !== '전체') {
    displayedTransactions = displayedTransactions.filter(tx => tx.category === selectedCategory);
  }
  
  const income = displayedTransactions.filter(tx => tx.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const expense = displayedTransactions.filter(tx => tx.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = income - expense;

  const categoryTotals = expenseCategories.reduce((acc, cat) => {
    acc[cat] = displayedTransactions.filter(tx => tx.type === 'expense' && tx.category === cat).reduce((sum, curr) => sum + curr.amount, 0);
    return acc;
  }, {});

  // 파이 차트 CSS 계산 로직
  const totalExpenseForChart = expenseCategories.reduce((sum, cat) => sum + categoryTotals[cat], 0);
  let accumulated = 0;
  const conicParts = expenseCategories.map(cat => {
    const amt = categoryTotals[cat];
    if (amt === 0) return '';
    const percent = (amt / totalExpenseForChart) * 100;
    const start = accumulated;
    const end = accumulated + percent;
    accumulated = end;
    return `${expenseColors[cat]} ${start}% ${end}%`;
  }).filter(p => p !== '').join(', ');
  const pieBackground = totalExpenseForChart > 0 ? `conic-gradient(${conicParts})` : '#e5e7eb';

  return (
    <div style={{ fontFamily: '맑은 고딕, sans-serif', padding: '10px', maxWidth: '750px', margin: '0 auto', backgroundColor: '#f4f5f7', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* 상단 타이틀 바 */}
        <div style={{ backgroundColor: '#107c41', color: '#fff', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>📊 가계부</span>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={exportToCSV} style={{ padding: '6px 10px', backgroundColor: '#fff', color: '#107c41', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginRight: '5px' }}>
              📥 엑셀 저장
            </button>
            <input type="month" value={currentMonth} disabled={isAllView} onChange={(e) => setCurrentMonth(e.target.value)} style={{ padding: '5px 8px', borderRadius: '3px', border: 'none', fontSize: '13px', backgroundColor: isAllView ? '#e5e7eb' : '#fff', color: '#333' }} />
            <button onClick={() => setIsAllView(!isAllView)} style={{ padding: '6px 10px', backgroundColor: isAllView ? '#047857' : '#ffffff', color: isAllView ? '#fff' : '#107c41', border: '1px solid #fff', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
              {isAllView ? '전체 🔍' : '전체'}
            </button>
          </div>
        </div>

        <div style={{ padding: '15px' }}>
          {/* 요약 카드 */}
          <div style={{ display: 'flex', width: '100%', backgroundColor: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '15px' }}>
            <div style={{ flex: 1, padding: '10px 5px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>총 수입</span>
              <p style={{ color: '#047857', margin: '5px 0 0 0', fontSize: '15px', fontWeight: 'bold', wordBreak: 'break-all' }}>+{income.toLocaleString()}</p>
            </div>
            <div style={{ flex: 1, padding: '10px 5px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>총 지출</span>
              <p style={{ color: '#dc2626', margin: '5px 0 0 0', fontSize: '15px', fontWeight: 'bold', wordBreak: 'break-all' }}>-{expense.toLocaleString()}</p>
            </div>
            <div style={{ flex: 1, padding: '10px 5px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>잔액</span>
              <p style={{ margin: '5px 0 0 0', fontSize: '15px', fontWeight: 'bold', color: balance >= 0 ? '#1f2937' : '#dc2626', wordBreak: 'break-all' }}>{balance.toLocaleString()}</p>
            </div>
          </div>

          {/* 파이 차트 & 지출 상세 */}
          <div style={{ marginBottom: '15px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '15px', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: pieBackground, flexShrink: 0, border: '1px solid #d1d5db', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {expenseCategories.map(cat => (
                <div key={cat} style={{ backgroundColor: '#fff', borderLeft: `4px solid ${expenseColors[cat]}`, padding: '6px 10px', borderRadius: '3px', flex: '1 1 100px', borderTop: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '11px', color: '#4b5563', display: 'block', fontWeight: 'bold' }}>{cat}</span>
                  <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: 'bold' }}>{categoryTotals[cat].toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </div>

          {/* 필터 및 입력 폼 */}
          <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f9fafb', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>🔍 모아보기:</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '6px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '13px', flex: 1, backgroundColor: '#fff' }}>
              <option value="전체">모든 항목</option>
              <optgroup label="--- 지출 ---">{expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</optgroup>
              <optgroup label="--- 수입 ---">{incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</optgroup>
            </select>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', backgroundColor: editId ? '#fffbeb' : '#f9fafb', padding: '12px', border: `1px solid ${editId ? '#fcd34d' : '#e5e7eb'}`, borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: editId ? '#d97706' : '#374151', marginBottom: '4px' }}>
              {editId ? '✏️ 내역 수정 중' : '📝 새 내역 추가'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} style={{ flex: '1 1 120px', padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '13px' }} />
              <select value={type} onChange={handleTypeChange} style={{ flex: '1 1 80px', padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '13px' }}>
                <option value="expense">지출</option>
                <option value="income">수입</option>
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: '2 1 100px', padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '13px' }}>
                {type === 'expense' ? expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>) : incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="상세 내용" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: '2 1 120px', padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '13px' }} />
              <input type="number" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: '1 1 100px', padding: '8px', borderRadius: '3px', border: '1px solid #d1d5db', fontSize: '13px' }} />
              <button type="submit" style={{ flex: '1 1 80px', padding: '8px', backgroundColor: editId ? '#f59e0b' : '#107c41', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                {editId ? '수정 완료' : '추가'}
              </button>
              {editId && (
                <button type="button" onClick={() => {setEditId(null); setText(''); setAmount('');}} style={{ flex: '1 1 60px', padding: '8px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '13px' }}>
                  취소
                </button>
              )}
            </div>
          </form>

          {/* 내역 리스트 테이블 */}
          <div style={{ overflowX: 'auto', margin: '0 -15px', padding: '0 15px' }}>
            <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db', color: '#374151' }}>
                  <th style={{ padding: '8px 5px', width: '60px', whiteSpace: 'nowrap' }}>날짜</th>
                  <th style={{ padding: '8px 5px', width: '50px', whiteSpace: 'nowrap' }}>분류</th>
                  <th style={{ padding: '8px 5px', minWidth: '100px' }}>내용</th>
                  <th style={{ padding: '8px 5px', width: '80px', textAlign: 'right', whiteSpace: 'nowrap' }}>금액</th>
                  <th style={{ padding: '8px 5px', width: '70px', textAlign: 'center', whiteSpace: 'nowrap' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>내역이 없습니다.</td></tr>
                ) : (
                  displayedTransactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: editId === tx.id ? '#fffbeb' : 'transparent' }}>
                      <td style={{ padding: '8px 5px', color: '#4b5563', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {tx.date.slice(5).replace('-', '.')} {/* 11.05 형식으로 표시 */}
                        {isAllView && <div style={{fontSize: '9px', color: '#9ca3af'}}>{tx.date.slice(0,4)}</div>}
                      </td>
                      <td style={{ padding: '8px 5px' }}>
                        <span style={{ fontSize: '11px', backgroundColor: '#e5e7eb', padding: '2px 4px', borderRadius: '3px', color: '#374151', fontWeight: 'bold' }}>{tx.category}</span>
                      </td>
                      <td style={{ padding: '8px 5px', color: '#1f2937', wordBreak: 'break-all' }}>{tx.text}</td>
                      <td style={{ padding: '8px 5px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap', color: tx.type === 'income' ? '#047857' : '#dc2626' }}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 5px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleEdit(tx)} style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '3px', padding: '3px 5px', cursor: 'pointer', fontSize: '11px', marginRight: '4px' }}>수정</button>
                        <button onClick={() => deleteTransaction(tx.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '3px', padding: '3px 5px', cursor: 'pointer', fontSize: '11px' }}>삭제</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
export default App;
