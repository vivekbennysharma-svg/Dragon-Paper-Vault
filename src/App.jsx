import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logo from './assets/logo.png';

const API_BASE = '/api';

export default function App() {
  // Dropdown Lists populated from API
  const [subjects, setSubjects] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [papers, setPapers] = useState([]);

  // Selected Values
  const [selSubject, setSelSubject] = useState('');
  const [selSchool, setSelSchool] = useState('');
  const [selClass, setSelClass] = useState('');
  const [selYear, setSelYear] = useState('');

  // Upload State
  const [upSub, setUpSub] = useState('');
  const [upSchool, setUpSchool] = useState('');
  const [upClass, setUpClass] = useState('');
  const [upYear, setUpYear] = useState('');
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  // Load root level (Subjects) on launch
  useEffect(() => {
    fetchLevel('', setSubjects);
  }, []);

  // Cascading Hooks: Fetch next folder layer when a selection changes
  useEffect(() => {
    if (selSubject) {
      fetchLevel(`${selSubject}`, setSchools);
      clearDownstream(['school', 'class', 'year']);
    }
  }, [selSubject]);

  useEffect(() => {
    if (selSubject && selSchool) {
      fetchLevel(`${selSubject}/${selSchool}`, setClasses);
      clearDownstream(['class', 'year']);
    }
  }, [selSchool]);

  useEffect(() => {
    if (selSubject && selSchool && selClass) {
      fetchLevel(`${selSubject}/${selSchool}/${selClass}`, setYears);
      clearDownstream(['year']);
    }
  }, [selClass]);

  useEffect(() => {
    if (selSubject && selSchool && selClass && selYear) {
      fetchLevel(`${selSubject}/${selSchool}/${selClass}/${selYear}`, setPapers);
    }
  }, [selYear]);

  const fetchLevel = async (folderPath, setList) => {
    try {
      const res = await axios.get(`${API_BASE}/navigation?path=${encodeURIComponent(folderPath)}`);
      setList(res.data);
    } catch (err) {
      console.error("Error navigating folders", err);
    }
  };

  const clearDownstream = (levels) => {
    if (levels.includes('school')) { setSelSchool(''); setSchools([]); }
    if (levels.includes('class')) { setSelClass(''); setClasses([]); }
    if (levels.includes('year')) { setSelYear(''); setYears([]); setPapers([]); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !upSub || !upSchool || !upClass || !upYear) return alert("Fill out all boxes!");

    setUploadStatus('Processing and uploading paper...');

    // Use FileReader to convert the selected document into a web-safe Base64 block
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1]; // Strips off content headers

      const payload = {
        subject: upSub,
        school: upSchool,
        className: upClass,
        year: upYear,
        fileName: file.name,
        fileData: base64Data
      };

      try {
        await axios.post(`${API_BASE}/upload`, payload, {
          headers: { 'Content-Type': 'application/json' }
        });
        setUploadStatus('Paper filed successfully!');
        setUpSub(''); setUpSchool(''); setUpClass(''); setUpYear(''); setFile(null);
        
        // Reset and trigger top level state list reload
        const res = await axios.get(`${API_BASE}/navigation?path=`);
        setSubjects(res.data);
      } catch (err) {
        setUploadStatus('Upload failed: ' + (err.response?.data?.error || err.message));
      }
    };
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img src={logo} alt="Dragon Paper Vault Logo" style={{ height: '80px', marginBottom: '12px' }} />
        <h1 style={{ color: '#1e293b', margin: '0 0 8px 0' }}>Dragon Paper Vault</h1>
        <p style={{ color: '#64748b' }}>Let us all impart our knowledge with everyone.</p>
      </header>

      {/* FILTER PANEL */}
      <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#334155' }}>🔍 Search Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>1. SUBJECT</label>
            <select value={selSubject} onChange={e => setSelSubject(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
              <option value="">Select Subject...</option>
              {subjects.map((s, i) => <option key={i} value={s.rawName}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>2. SCHOOL</label>
            <select value={selSchool} onChange={e => setSelSchool(e.target.value)} disabled={!selSubject} style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
              <option value="">Select School...</option>
              {schools.map((s, i) => <option key={i} value={s.rawName}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>3. CLASS</label>
            <select value={selClass} onChange={e => setSelClass(e.target.value)} disabled={!selSchool} style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
              <option value="">Select Class...</option>
              {classes.map((c, i) => <option key={i} value={c.rawName}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>4. YEAR</label>
            <select value={selYear} onChange={e => setSelYear(e.target.value)} disabled={!selClass} style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
              <option value="">Select Year...</option>
              {years.map((y, i) => <option key={i} value={y.rawName}>{y.name}</option>)}
            </select>
          </div>

        </div>
      </section>

      {/* 2. RESULT SHOWCASE */}
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>📄 Available Documents</h3>
          {!selYear ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Please configure all dropdown filters above to locate files.</p>
          ) : papers.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No documents stored inside this specific folder path yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {papers.map((paper, idx) => (
                <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                  <span style={{ fontWeight: '500' }}>{paper.name}</span>
                  <a 
                    href={`${API_BASE}/download?filepath=${encodeURIComponent(selSubject + '/' + selSchool + '/' + selClass + '/' + selYear + '/' + paper.rawName)}`}
                    target="_blank" 
                    rel="noreferrer"
                    style={{ background: '#2563eb', color: 'white', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}
                  >
                  View / Download File
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      {/* UPLOAD FORM */}
      <section style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', background: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>📤 Contribute a Paper</h3>
        <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <input type="text" placeholder="Subject (e.g., Physics)" value={upSub} onChange={e => setUpSub(e.target.value)} style={{ padding: '10px', borderRadius: '6px' }} required />
          <input type="text" placeholder="School (e.g., Lincoln High)" value={upSchool} onChange={e => setUpSchool(e.target.value)} style={{ padding: '10px', borderRadius: '6px' }} required />
          <input type="text" placeholder="Class (e.g., Class 11)" value={upClass} onChange={e => setUpClass(e.target.value)} style={{ padding: '10px', borderRadius: '6px' }} required />
          <input type="number" placeholder="Year (e.g., 2026)" value={upYear} onChange={e => setUpYear(e.target.value)} style={{ padding: '10px', borderRadius: '6px' }} required />
          <input type="file" onChange={e => setFile(e.target.files[0])} style={{ gridColumn: 'span 2' }} required />
          <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Submit</button>
        </form>
        {uploadStatus && <p style={{ marginTop: '12px', color: '#047857', textAlign: 'center', fontWeight: 'bold' }}>{uploadStatus}</p>}
      </section>
    {/* 4. NEW INTERACTIVE FOOTER SYSTEM */}
      <footer style={{ /* backgroundColor: '#16171d', color: '#94a3b8', */padding: '40px 20px', borderTop: '4px solid #3b82f6', fontSize: '14px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '30px' }}>
          
          {/* Left Block - Title & Desc */}
          <div style={{ flex: '1 1 250px' }}>
            <h4 style={{ /*color: '#f8fafc', */margin: '0 0 12px 0', fontSize: '16px' }}>🐉 Dragon Paper Vault</h4>
            <p style={{ lineHeight: '1.6', margin: 0 }}>
              An open, student-driven academic repository designed to preserve old examination sheets and question paper matrices transparently.
            </p>
          </div>

          {/* Middle Block - Quick Links */}
          <div style={{ flex: '1 1 150px' }}>
            <h4 style={{ /*color: '#f8fafc', */margin: '0 0 12px 0', fontSize: '16px' }}>Quick Navigation</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
              <li><a href="#" style={{ /* color: '#cbd5e1', */textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Search Vault</a></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: '#cbd5e1', textDecoration: 'none' }}>GitHub Storage</a></li>
              <li><a href="#" style={{/* color: '#cbd5e1', */textDecoration: 'none' }} onClick={(e) => e.preventDefault()}>Terms of Access</a></li>
            </ul>
          </div>

          {/* Right Block - Dummy Contact Support Info */}
          <div style={{ flex: '1 1 200px' }}>
            <h4 style={{/* color: '#f8fafc', */margin: '0 0 12px 0', fontSize: '16px' }}>Contact</h4>
            <p style={{ margin: '0 0 6px 0' }}>📬 Email: <span style={{ color: '#cbd5e1' }}>vivekbennysharma@gmail.com</span></p>
            <p style={{ margin: 0 }}>🛠️ Founded and Maintained by <b><a href="https://www.facebook.com/vivek.benny.sharma" target="_blank">Vivek Sharma</a></b></p>
          </div>

        {/* Bottom Horizontal Separation Rules & Copyright statement */}
        <hr style={{ borderColor: '#334155', margin: '30px 0 20px 0' }} />
        <div style={{ textAlign: 'center', fontSize: '12px'/*, color: '#64748b' */}}>
          &copy; {new Date().getFullYear()} Dragon Paper Vault Archive Systems. All Rights Reserved. Powered by Serverless Cloud Operations.
        </div>
        </div>
      </footer>
    </div>
  );
}
