// frontend/src/SearchDonorsModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import API from './api';

export default function SearchDonorsModal({ open, onClose, initialQuery = {} }) {
  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState([]);
  const [bloodType, setBloodType] = useState(initialQuery.blood_type || '');
  const [city, setCity] = useState(initialQuery.city || '');
  const modalRef = useRef();

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      // focus trap simple
      setTimeout(() => modalRef.current && modalRef.current.focus(), 120);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  useEffect(() => {
    if (open && (bloodType || city)) {
      doSearch();
    } else if (open) {
      setDonors([]);
    }
    // eslint-disable-next-line
  }, [open]);

  async function doSearch(e) {
    e && e.preventDefault();
    setLoading(true);
    setDonors([]);
    try {
      const res = await API.get('/donors', { params: { blood_type: bloodType, city } });
      setDonors(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div id="searchDonorsModal" className="animate-modal-enter" role="dialog" aria-modal="true" tabIndex="-1">
      <div className="modal-content max-w-6xl" ref={modalRef}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        <div className="modal-body">
          <header className="bg-gradient-to-r p-6 rounded-lg mb-4">
            <h2 className="text-2xl font-semibold">Search Donors</h2>
            <p className="text-sm text-gray-600">Find donors by blood group and location</p>
          </header>

          <form onSubmit={doSearch} className="grid lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Blood Group</label>
              <select value={bloodType} onChange={(e)=>setBloodType(e.target.value)} className="w-full p-2 border rounded">
                <option value="">Any</option>
                <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">City / District</label>
              <input className="w-full p-2 border rounded" placeholder="City or district" value={city} onChange={(e)=>setCity(e.target.value)} />
            </div>

            <div className="flex items-end gap-2">
              <button className="btn" type="submit">Search</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setBloodType(''); setCity(''); setDonors([]); }}>Reset</button>
            </div>
          </form>

          <div className="modal-results" style={{ maxHeight: '60vh', overflow: 'auto' }}>
            {loading ? <div id="loadingState">Loading...</div> : (
              donors.length === 0 ? <div>No donors found.</div> : (
                <div id="donorResults" className="grid lg:grid-cols-3 gap-4">
                  {donors.map(d => (
                    <div key={d.id} className="donor-card card-hover animate-fade-in-up">
                      <div style={{display:'flex', gap:12, alignItems:'center'}}>
                        <div className="avatar-placeholder">{(d.name||'D')[0]}</div>
                        <div>
                          <div style={{fontWeight:700}}>{d.name}</div>
                          <div style={{color:'#666', fontSize:13}}>{d.city} • {d.blood_group}</div>
                          <div style={{marginTop:6}}><a href={`tel:${d.phone}`} className="contact-btn">Call: {d.phone}</a></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
