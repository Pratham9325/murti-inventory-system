import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, writeBatch
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import {
  Search, Plus, LayoutDashboard, Boxes, MapPin, Trash2, X, Edit3,
  PackagePlus, LogOut, UserRound, Camera, SlidersHorizontal,
  ChevronRight, AlertTriangle, CheckCircle2, Copy, RefreshCw
} from 'lucide-react';
import './style.css';

const emptyForm = { number: '', name: '', location: '' };

function App() {
  const [items, setItems] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [showLocationAdd, setShowLocationAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicatePopup, setDuplicatePopup] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  useEffect(() => {
    if (!authUser) {
      setItems([]); setSavedLocations([]); setLoading(false); return;
    }
    const q = query(collection(db, 'murtis'), orderBy('createdAt', 'desc'));
    const unsubMurtis = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false); setError('');
    }, e => {
      setError(e.message.includes('index')
        ? 'Firestore needs an index. Use the link shown in Firebase or temporarily remove the createdAt sort.'
        : e.message);
      setLoading(false);
    });
    const unsubLocations = onSnapshot(collection(db, 'locations'), snap => {
      setSavedLocations(
        snap.docs.map(d => ({ id: d.id, name: d.data().name }))
          .filter(x => x.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }, e => setError(e.message));
    return () => { unsubMurtis(); unsubLocations(); };
  }, [authUser]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter(x =>
      String(x.number ?? '').toLowerCase().includes(s) ||
      String(x.name ?? '').toLowerCase().includes(s)
    );
  }, [items, search]);

  const locations = useMemo(() => {
    const m = {};
    items.forEach(x => { const k = x.location || 'Unknown'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const duplicates = useMemo(() => {
    const m = {};
    items.forEach(x => {
      const n = String(x.number || '').trim();
      if (n) m[n] = (m[n] || 0) + 1;
    });
    return Object.entries(m).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowAdd(true); };
  const openEdit = item => {
    setEditing(item);
    setForm({ number: item.number || '', name: item.name || '', location: item.location || '' });
    setShowAdd(true);
  };

  async function saveMurti(e) {
    e.preventDefault();
    if (!form.number.trim() || !form.location.trim()) return;
    setSaving(true); setError('');
    try {
      const data = { number: form.number.trim(), name: form.name.trim(), location: form.location.trim() };
      if (editing) await updateDoc(doc(db, 'murtis', editing.id), data);
      else await addDoc(collection(db, 'murtis'), { ...data, createdAt: serverTimestamp() });
      setForm(emptyForm); setShowAdd(false); setEditing(null); setTab('inventory');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm('Delete this murti record?')) return;
    try { await deleteDoc(doc(db, 'murtis', id)); }
    catch (e) { setError(e.message); }
  }

  async function clearAll() {
    if (!items.length) return;
    if (!confirm(`Delete all ${items.length} murti records? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      items.forEach(x => batch.delete(doc(db, 'murtis', x.id)));
      savedLocations.forEach(x => batch.delete(doc(db, 'locations', x.id)));
      await batch.commit();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function doLogin(e) {
    e.preventDefault(); setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, login.email, login.password);
      setShowLogin(false); setLogin({ email: '', password: '' });
    } catch (e) { setLoginError(e.message); }
  }

  if (!authUser) return (
    <div className="loginScreen">
      <div className="loginCard">
        <div className="brandIcon big">M</div>
        <span className="kicker">MURTI INVENTORY</span>
        <h1>Welcome back</h1>
        <p>Sign in with the Email/Password account enabled in Firebase to manage inventory.</p>
        <button className="primary full" onClick={() => setShowLogin(true)}><UserRound size={18}/> Admin Login</button>
        <div className="loginNote"><CheckCircle2 size={16}/> Your inventory stays in Firebase Firestore.</div>
      </div>
      {showLogin && <LoginModal login={login} setLogin={setLogin} close={() => setShowLogin(false)} save={doLogin} error={loginError}/>} 
    </div>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <Nav tab={tab} setTab={setTab} desktop />
        <div className="sideBottom">
          <button className="ghostBtn" onClick={() => setShowLogin(true)}><UserRound size={18}/>{authUser.email}</button>
          <button className="ghostBtn" onClick={() => signOut(auth)}><LogOut size={18}/>Sign out</button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div className="eyebrow">Ganpati Inventory</div>
            <h1>{tab === 'dashboard' ? 'Dashboard' : tab === 'inventory' ? 'Inventory' : tab === 'locations' ? 'Locations' : 'Search'}</h1>
          </div>
          <div className="headerActions">
            <button className="loginMobile" onClick={() => setShowLogin(true)}><UserRound size={18}/></button>
            <button className="primary" onClick={openAdd}><Plus size={19}/> Add Murti</button>
          </div>
        </header>

        {error && <div className="error"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}

        {tab === 'dashboard' && <Dashboard items={items} locations={locations} duplicates={duplicates} filtered={filtered} search={search} setSearch={setSearch} loading={loading} onAdd={openAdd} onEdit={openEdit} onDelete={remove} onClear={clearAll} onDuplicates={() => setDuplicatePopup(true)} />}
        {tab === 'inventory' && <Inventory filtered={filtered} search={search} setSearch={setSearch} loading={loading} remove={remove} edit={openEdit}/>} 
        {tab === 'locations' && <Locations locations={locations} onSelect={value => { setSearch(value); setTab('search'); }}/>} 
        {tab === 'search' && <SearchPage search={search} setSearch={setSearch} filtered={filtered} loading={loading} onEdit={openEdit} onDelete={remove}/>} 
      </main>

      <nav className="bottom"><Nav tab={tab} setTab={setTab}/></nav>

      {showAdd && <Modal
        locations={savedLocations}
        addLocation={() => setShowLocationAdd(true)}
        form={form}
        setForm={setForm}
        close={() => { setShowAdd(false); setEditing(null); }}
        save={saveMurti}
        editing={!!editing}
        saving={saving}
      />}
      {showLocationAdd && <LocationModal locations={savedLocations} close={() => setShowLocationAdd(false)} />}
      {showLogin && <LoginModal login={login} setLogin={setLogin} close={() => setShowLogin(false)} save={doLogin} error={loginError}/>} 
      {duplicatePopup && <DuplicateModal duplicates={duplicates} items={items} close={() => setDuplicatePopup(false)}/>} 
      {saving && !showAdd && <GlobalLoader text="Saving changes..."/>}
    </div>
  );
}

function Brand(){ return <div className="brand"><div className="brandIcon">M</div><div><b>Murti</b><span>Inventory</span></div></div>; }

function Nav({tab,setTab,desktop=false}){
  return <div className={`navlinks ${desktop ? 'desktopNav' : ''}`}>
    <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}><LayoutDashboard/><span>Dashboard</span></button>
    <button className={tab==='inventory'?'active':''} onClick={()=>setTab('inventory')}><Boxes/><span>Inventory</span></button>
    <button className={tab==='locations'?'active':''} onClick={()=>setTab('locations')}><MapPin/><span>Locations</span></button>
    {!desktop && <button className={tab==='search'?'active':''} onClick={()=>setTab('search')}><Search/><span>Search</span></button>}
  </div>;
}

function Dashboard({items,locations,duplicates,filtered,search,setSearch,loading,onAdd,onEdit,onDelete,onClear,onDuplicates}){
  return <div className="content">
    <section className="hero"><div><p>Total Murtis</p><strong>{items.length}</strong><small>All inventory records</small></div><div className="heroOrb">◈</div></section>
    <div className="cards">
      <Stat icon={<Boxes/>} label="Inventory" value={items.length}/>
      <Stat icon={<MapPin/>} label="Locations" value={locations.length}/>
      <button className="card cardButton" onClick={onDuplicates}><div className="statIcon"><Copy/></div><span>Duplicate Numbers</span><b>{duplicates.length}</b><small>Tap to view numbers</small></button>
    </div>
    <section className="searchFeature">
      <div className="sectionTitle"><div><span className="kicker">FAST SEARCH</span><h2>Find a Murti</h2><p>Search by number or name. Name is optional.</p></div><SlidersHorizontal size={20}/></div>
      <div className="searchBox"><Search size={21}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Enter number or name..."/><span>{search ? `${filtered.length} found` : 'All records'}</span></div>
      {search ? <ResultList items={filtered} onEdit={onEdit} onDelete={onDelete}/> : <div className="searchHint"><Search size={28}/><div><b>Search is ready</b><span>Type a number or name above to show only matching records.</span></div></div>}
    </section>
    <div className="sectionHead"><h2>Locations</h2><span>{locations.length} locations</span></div>
    <div className="locationStrip">{locations.slice(0,4).map(([name,count])=><div className="miniLocation" key={name}><MapPin size={17}/><div><b>{name}</b><span>{count} murtis</span></div></div>)}{!locations.length && <div className="emptySmall">No locations yet.</div>}</div>
    <div className="utilityRow"><button className="secondary" onClick={onAdd}><PackagePlus size={17}/> Add first / another Murti</button><button className="dangerOutline" onClick={onClear}><Trash2 size={17}/> Clear all data</button></div>
  </div>;
}

function Stat({icon,label,value}){ return <div className="card"><div className="statIcon">{icon}</div><span>{label}</span><b>{value}</b></div>; }

function ResultList({items,onEdit,onDelete}){ return <div className="results">{items.length ? items.map(x=><Result key={x.id} item={x} onEdit={onEdit} onDelete={onDelete}/>) : <div className="emptySearch"><Search size={28}/><div><b>No matching record</b><span>Try another number or name.</span></div></div>}</div>; }

function Result({item,onEdit,onDelete,compact=false}){
  return <div className={`result ${compact ? 'compactResult' : ''}`}>
    <div className="resultMain"><div className="resultNumber">{item.number}</div><div className="resultLocation"><MapPin size={18}/>{item.location}</div></div>
    {!compact && <div className="resultActions"><button className="iconBtn" title="Edit" onClick={()=>onEdit(item)}><Edit3 size={17}/></button><button className="iconBtn delete" title="Delete" onClick={()=>onDelete(item.id)}><Trash2 size={17}/></button></div>}
  </div>;
}

function SearchPage({search,setSearch,filtered,loading,onEdit,onDelete}){
  return <div className="content searchPage">
    <div className="searchPageHeader"><span className="kicker">IMPORTANT SEARCH</span><h2>Find Murti</h2><p>Search using <b>number</b> or <b>name</b>. Name is optional.</p></div>
    <div className="searchPageBox"><Search size={22}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search number or name..."/><button className="clearSearch" onClick={()=>setSearch('')}><X size={18}/></button></div>
    {loading ? <Loading/> : search.trim() ? <div className="searchOnlyResults"><div className="searchCount">{filtered.length} result{filtered.length===1?'':'s'} found</div><ResultList items={filtered} onEdit={onEdit} onDelete={onDelete}/></div> : <div className="searchBlank"><Search size={46}/><b>Search a murti</b><span>Enter a number or name above.</span></div>}
  </div>;
}

function Inventory({filtered,search,setSearch,loading,remove,edit}){ return <div className="content"><div className="pageIntro"><div><span className="kicker">ALL RECORDS</span><h2>Murti Inventory</h2><p>Number is required. Name is optional. Duplicate numbers are allowed.</p></div></div><div className="searchPanel"><Search size={20}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by number or name..."/><span>{filtered.length} found</span></div>{loading?<Loading/>:<ResultList items={filtered} onEdit={edit} onDelete={remove}/>}</div>; }

function Locations({locations,onSelect}){ return <div className="content"><div className="pageIntro"><span className="kicker">ORGANIZE</span><h2>Locations</h2><p>See how many murtis are stored at each location.</p></div><div className="locationGrid">{locations.map(([name,count])=><button className="locationCard" key={name} onClick={()=>onSelect(name)}><MapPin/><div><b>{name}</b><span>{count} {count===1?'murti':'murtis'}</span></div><ChevronRight/></button>)}{!locations.length&&<div className="empty"><MapPin size={30}/><b>No locations added</b><span>Add a murti and enter its location.</span></div>}</div></div>; }
function Loading(){ return <div className="empty"><RefreshCw className="spin" size={24}/><span>Loading inventory...</span></div>; }

function Modal({form,setForm,close,save,editing,saving,locations,addLocation}){
  return <div className="overlay"><form className="modal" onSubmit={save}>
    <div className="modalHead"><div><b>{editing?'Edit Murti':'Add Murti'}</b><span>{editing?'Update this inventory record':'Create a new inventory record'}</span></div><button type="button" onClick={close}><X/></button></div>
    <div className="modalBody">
      <label>Murti Number *<input autoFocus value={form.number} onChange={e=>setForm({...form,number:e.target.value})} placeholder="e.g. 1045" required/></label>
      <label>Murti Name <span className="optional">(optional)</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Ganpati Raja"/></label>
      <div className="locationField"><label>Location *</label><div className="locationRow">
        <select value={form.location} onChange={e=>setForm({...form,location:e.target.value})} required>
          <option value="">Select a saved location</option>
          {locations.map(l=><option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        <button type="button" className="addLocationBtn" onClick={addLocation}><Plus size={17}/> Add Location</button>
      </div><span className="fieldHint">Save a location once, then reuse it for every murti.</span></div>
      <div className="photoNotice"><Camera size={18}/><div><b>Photo</b><span>Optional. Firebase Storage is not enabled on the current setup.</span></div></div>
    </div>
    <div className="modalActions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving?<><RefreshCw className="spin" size={16}/> Saving...</>:editing?'Update Murti':'Save Murti'}</button></div>
  </form></div>;
}

function LocationModal({locations,close}){
  const [name,setName]=useState(''); const [saving,setSaving]=useState(false); const [msg,setMsg]=useState('');
  async function saveLocation(e){
    e.preventDefault(); const clean=name.trim().replace(/\s+/g,' '); if(!clean)return;
    if(locations.some(x=>x.name.toLowerCase()===clean.toLowerCase())){setMsg('This location already exists. Select it from the list.');return;}
    setSaving(true); setMsg('');
    try { await addDoc(collection(db,'locations'),{name:clean,createdAt:serverTimestamp()}); close(); }
    catch(e){setMsg(e.message)} finally{setSaving(false)}
  }
  return <div className="overlay overlayTop"><form className="modal smallModal" onSubmit={saveLocation}>
    <div className="modalHead"><div><b>Add Location</b><span>Create once and reuse it for multiple murtis.</span></div><button type="button" onClick={close}><X/></button></div>
    <div className="modalBody">
      <label>Location Name *<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Room A" required/></label>
      {msg && <div className="error modalError"><AlertTriangle size={16}/><span>{msg}</span></div>}
      <div className="savedLocationPreview"><b>Saved locations</b>{locations.length ? locations.slice(0,10).map(x=><span key={x.id}>• {x.name}</span>) : <span>No locations yet</span>}</div>
    </div>
    <div className="modalActions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving?<><RefreshCw className="spin" size={16}/> Saving...</>:'Save Location'}</button></div>
  </form></div>;
}

function DuplicateModal({duplicates,items,close}){
  return <div className="overlay"><div className="modal duplicateModal">
    <div className="modalHead"><div><b>Duplicate Numbers</b><span>Numbers entered more than once.</span></div><button type="button" onClick={close}><X/></button></div>
    <div className="duplicateList">{duplicates.length ? duplicates.map(([number,count])=>{
      const records=items.filter(x=>String(x.number).trim()===number);
      return <div className="duplicateItem" key={number}><div className="duplicateNumber">{number}</div><b>{count} entries</b><div className="duplicateLocations">{records.map(x=><span key={x.id}><MapPin size={14}/>{x.location}</span>)}</div></div>;
    }) : <div className="empty">No duplicate numbers.</div>}</div>
    <div className="modalActions"><button className="primary" onClick={close}>Done</button></div>
  </div></div>;
}

function GlobalLoader({text}){ return <div className="globalLoader"><div className="loaderCard"><RefreshCw className="spin" size={24}/><b>{text}</b><span>Please wait...</span></div></div>; }
function LoginModal({login,setLogin,close,save,error}){ return <div className="overlay"><form className="modal" onSubmit={save}><div className="modalHead"><div><b>Admin Login</b><span>Use the Email/Password provider enabled in Firebase.</span></div><button type="button" onClick={close}><X/></button></div>{error&&<div className="loginError"><AlertTriangle size={16}/>{error}</div>}<label>Email<input type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/></label><label>Password<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label><div className="modalActions"><button type="button" onClick={close}>Cancel</button><button className="primary">Sign in</button></div></form></div>; }

createRoot(document.getElementById('root')).render(<App/>);
