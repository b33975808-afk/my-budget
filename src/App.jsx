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
            <button onClick={exportToCSV} style={{ padding: '6px 10px', backgroundColor: '#fff',
