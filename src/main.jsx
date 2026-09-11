import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

import { db, auth } from './firebase';

import {
  Search,
  Plus,
  LayoutDashboard,
  Boxes,
  MapPin,
  Trash2,
  X,
  Edit3,
  PackagePlus,
  LogOut,
  UserRound,
  Camera,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  Hash,
  Warehouse,
  Eye,
  ExternalLink
} from 'lucide-react';

import './style.css';


const APP_LOGO =
  'https://api.iconify.design/mdi:elephant.svg?color=%236d4aff&width=128&height=128';

const emptyForm = {
  number: '',
  name: '',
  location: ''
};


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

  const [login, setLogin] = useState({
    email: '',
    password: ''
  });

  const [loginError, setLoginError] = useState('');

  const [saving, setSaving] = useState(false);

  const [duplicatePopup, setDuplicatePopup] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState(null);


  /* AUTH */

  useEffect(() => {
    return onAuthStateChanged(auth, setAuthUser);
  }, []);


  /* FIREBASE DATA */

  useEffect(() => {

    if (!authUser) {
      setItems([]);
      setSavedLocations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'murtis'),
      orderBy('createdAt', 'desc')
    );

    const unsubMurtis = onSnapshot(
      q,
      snap => {

        setItems(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );

        setLoading(false);
        setError('');
      },

      e => {

        setError(
          e.message.includes('index')
            ? 'Firestore needs an index. Use the Firebase link shown in the error.'
            : e.message
        );

        setLoading(false);
      }
    );


    const unsubLocations = onSnapshot(
      collection(db, 'locations'),

      snap => {

        setSavedLocations(

          snap.docs
            .map(d => ({
              id: d.id,
              name: d.data().name
            }))
            .filter(x => x.name)
            .sort((a, b) =>
              a.name.localeCompare(b.name)
            )

        );
      },

      e => setError(e.message)
    );


    return () => {
      unsubMurtis();
      unsubLocations();
    };

  }, [authUser]);


  /* SEARCH */

  const filtered = useMemo(() => {

    const s = search.trim().toLowerCase();

    if (!s) return items;

    return items.filter(x =>
      String(x.number ?? '')
        .toLowerCase()
        .includes(s) ||

      String(x.name ?? '')
        .toLowerCase()
        .includes(s)
    );

  }, [items, search]);


  /* LOCATION COUNTS */

  const locations = useMemo(() => {

    const map = {};

    items.forEach(item => {

      const location =
        item.location?.trim() || 'Unknown';

      if (!map[location]) {
        map[location] = [];
      }

      map[location].push(item);
    });

    return Object.entries(map)
      .sort((a, b) => b[1].length - a[1].length);

  }, [items]);


  /* DUPLICATES */

  const duplicates = useMemo(() => {

    const map = {};

    items.forEach(item => {

      const number =
        String(item.number || '').trim();

      if (number) {
        map[number] =
          (map[number] || 0) + 1;
      }

    });

    return Object.entries(map)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

  }, [items]);


  /* ADD */

  const openAdd = () => {

    setEditing(null);

    setForm(emptyForm);

    setShowAdd(true);
  };


  /* EDIT */

  const openEdit = item => {

    setEditing(item);

    setForm({
      number: item.number || '',
      name: item.name || '',
      location: item.location || ''
    });

    setShowAdd(true);
  };


  /* SAVE MURTI */

  async function saveMurti(e) {

    e.preventDefault();

    if (
      !form.number.trim() ||
      !form.location.trim()
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {

      const data = {
        number: form.number.trim(),
        name: form.name.trim(),
        location: form.location.trim()
      };


      if (editing) {

        await updateDoc(
          doc(db, 'murtis', editing.id),
          data
        );

      } else {

        await addDoc(
          collection(db, 'murtis'),
          {
            ...data,
            createdAt: serverTimestamp()
          }
        );

      }


      setForm(emptyForm);
      setShowAdd(false);
      setEditing(null);
      setTab('inventory');

    } catch (e) {

      setError(e.message);

    } finally {

      setSaving(false);

    }
  }


  /* DELETE */

  async function remove(id) {

    if (!confirm('Delete this murti record?')) {
      return;
    }

    try {

      await deleteDoc(
        doc(db, 'murtis', id)
      );

    } catch (e) {

      setError(e.message);

    }
  }


  /* CLEAR */

  async function clearAll() {

    if (!items.length) return;

    if (
      !confirm(
        `Delete all ${items.length} murti records? This cannot be undone.`
      )
    ) {
      return;
    }

    setSaving(true);

    try {

      const batch = writeBatch(db);

      items.forEach(item => {

        batch.delete(
          doc(db, 'murtis', item.id)
        );

      });

      savedLocations.forEach(location => {

        batch.delete(
          doc(db, 'locations', location.id)
        );

      });

      await batch.commit();

    } catch (e) {

      setError(e.message);

    } finally {

      setSaving(false);

    }
  }


  /* LOGIN */

  async function doLogin(e) {

    e.preventDefault();

    setLoginError('');

    try {

      await signInWithEmailAndPassword(
        auth,
        login.email,
        login.password
      );

      setShowLogin(false);

      setLogin({
        email: '',
        password: ''
      });

    } catch (e) {

      setLoginError(e.message);

    }
  }


  /* LOCATION OPEN */

  function openLocation(locationName) {

    setSelectedLocation(locationName);

    setTab('locationDetails');
  }


  /* LOGIN SCREEN */

  if (!authUser) {

    return (

      <div className="loginScreen">

        <div className="loginCard">

          <div className="appLogoLarge">
            <img
              src={APP_LOGO}
              alt="Murti Inventory"
            />
          </div>

          <span className="kicker">
            GANPATI INVENTORY
          </span>

          <h1>
            Murti Inventory
          </h1>

          <p>
            Manage your Ganpati murti numbers,
            locations and inventory from one place.
          </p>

          <button
            className="primary full"
            onClick={() => setShowLogin(true)}
          >
            <UserRound size={18} />
            Admin Login
          </button>

          <div className="loginNote">
            <CheckCircle2 size={16} />
            Inventory is securely stored in Firebase.
          </div>

        </div>


        {showLogin && (

          <LoginModal
            login={login}
            setLogin={setLogin}
            close={() => setShowLogin(false)}
            save={doLogin}
            error={loginError}
          />

        )}

      </div>

    );
  }


  return (

    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <Brand />

        <Nav
          tab={tab}
          setTab={setTab}
          desktop
        />

        <div className="sideBottom">

          <button
            className="ghostBtn"
            onClick={() => setShowLogin(true)}
          >
            <UserRound size={18} />
            {authUser.email}
          </button>


          <button
            className="ghostBtn"
            onClick={() => signOut(auth)}
          >
            <LogOut size={18} />
            Sign out
          </button>

        </div>

      </aside>


      {/* MAIN */}

      <main>

        <header>

          <div>

            <div className="eyebrow">
              Ganpati Inventory
            </div>

            <h1>

              {tab === 'dashboard'
                ? 'Dashboard'
                : tab === 'inventory'
                ? 'Inventory'
                : tab === 'locations'
                ? 'Locations'
                : tab === 'search'
                ? 'Search'
                : selectedLocation || 'Location'
              }

            </h1>

          </div>


          <div className="headerActions">

            <button
              className="loginMobile"
              onClick={() => setShowLogin(true)}
            >
              <UserRound size={18} />
            </button>


            <button
              className="primary"
              onClick={openAdd}
            >
              <Plus size={19} />
              Add Murti
            </button>

          </div>

        </header>


        {error && (

          <div className="error">

            <AlertTriangle size={17} />

            <span>{error}</span>

            <button
              onClick={() => setError('')}
            >
              <X size={16} />
            </button>

          </div>

        )}


        {tab === 'dashboard' && (

          <Dashboard
            items={items}
            locations={locations}
            duplicates={duplicates}
            filtered={filtered}
            search={search}
            setSearch={setSearch}
            loading={loading}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={remove}
            onClear={clearAll}
            onDuplicates={() =>
              setDuplicatePopup(true)
            }
            onLocation={openLocation}
          />

        )}


        {tab === 'inventory' && (

          <Inventory
            filtered={filtered}
            search={search}
            setSearch={setSearch}
            loading={loading}
            remove={remove}
            edit={openEdit}
          />

        )}


        {tab === 'locations' && (

          <Locations
            locations={locations}
            onSelect={openLocation}
          />

        )}


        {tab === 'locationDetails' && (

          <LocationDetails
            location={selectedLocation}
            items={items}
            onBack={() => setTab('locations')}
            onEdit={openEdit}
            onDelete={remove}
          />

        )}


        {tab === 'search' && (

          <SearchPage
            search={search}
            setSearch={setSearch}
            filtered={filtered}
            loading={loading}
            onEdit={openEdit}
            onDelete={remove}
          />

        )}

      </main>


      {/* MOBILE NAV */}

      <nav className="bottom">

        <Nav
          tab={tab}
          setTab={setTab}
        />

      </nav>


      {/* ADD / EDIT */}

      {showAdd && (

        <Modal
          locations={savedLocations}
          addLocation={() =>
            setShowLocationAdd(true)
          }
          form={form}
          setForm={setForm}
          close={() => {

            setShowAdd(false);
            setEditing(null);

          }}
          save={saveMurti}
          editing={!!editing}
          saving={saving}
        />

      )}


      {/* LOCATION MODAL */}

      {showLocationAdd && (

        <LocationModal
          locations={savedLocations}
          close={() =>
            setShowLocationAdd(false)
          }
        />

      )}


      {/* LOGIN */}

      {showLogin && (

        <LoginModal
          login={login}
          setLogin={setLogin}
          close={() => setShowLogin(false)}
          save={doLogin}
          error={loginError}
        />

      )}


      {/* DUPLICATES */}

      {duplicatePopup && (

        <DuplicateModal
          duplicates={duplicates}
          items={items}
          close={() =>
            setDuplicatePopup(false)
          }
        />

      )}


      {saving && !showAdd && (

        <GlobalLoader
          text="Saving changes..."
        />

      )}

    </div>
  );
}


/* =====================================================
   BRAND
===================================================== */

function Brand() {

  return (

    <div className="brand">

      <div className="brandIcon">

        <img
          src={APP_LOGO}
          alt=""
        />

      </div>

      <div>

        <b>Murti</b>
        <span>Inventory</span>

      </div>

    </div>

  );
}


/* =====================================================
   NAV
===================================================== */

function Nav({
  tab,
  setTab,
  desktop = false
}) {

  return (

    <div
      className={`navlinks ${
        desktop ? 'desktopNav' : ''
      }`}
    >

      <button
        className={
          tab === 'dashboard'
            ? 'active'
            : ''
        }
        onClick={() =>
          setTab('dashboard')
        }
      >
        <LayoutDashboard />
        <span>Dashboard</span>
      </button>


      <button
        className={
          tab === 'inventory'
            ? 'active'
            : ''
        }
        onClick={() =>
          setTab('inventory')
        }
      >
        <Boxes />
        <span>Inventory</span>
      </button>


      <button
        className={
          tab === 'locations' ||
          tab === 'locationDetails'
            ? 'active'
            : ''
        }
        onClick={() =>
          setTab('locations')
        }
      >
        <MapPin />
        <span>Locations</span>
      </button>


      {!desktop && (

        <button
          className={
            tab === 'search'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('search')
          }
        >
          <Search />
          <span>Search</span>
        </button>

      )}

    </div>

  );
}


/* =====================================================
   DASHBOARD
===================================================== */

function Dashboard({
  items,
  locations,
  duplicates,
  filtered,
  search,
  setSearch,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onClear,
  onDuplicates,
  onLocation
}) {

  return (

    <div className="content">

      <section className="hero">

        <div>

          <p>Total Murtis</p>

          <strong>
            {items.length}
          </strong>

          <small>
            All inventory records
          </small>

        </div>

        <div className="heroLogo">

          <img
            src={APP_LOGO}
            alt=""
          />

        </div>

      </section>


      <div className="cards">

        <Stat
          icon={<Boxes />}
          label="Inventory"
          value={items.length}
        />


        <Stat
          icon={<MapPin />}
          label="Locations"
          value={locations.length}
        />


        <button
          className="card cardButton"
          onClick={onDuplicates}
        >

          <div className="statIcon">
            <Copy />
          </div>

          <span>
            Duplicate Numbers
          </span>

          <b>
            {duplicates.length}
          </b>

          <small>
            Tap to view numbers
          </small>

        </button>

      </div>


      {/* SEARCH */}

      <section className="searchFeature">

        <div className="sectionTitle">

          <div>

            <span className="kicker">
              FAST SEARCH
            </span>

            <h2>
              Find a Murti
            </h2>

            <p>
              Search by number or name.
              Name is optional.
            </p>

          </div>

          <SlidersHorizontal size={20} />

        </div>


        <div className="searchBox">

          <Search size={21} />

          <input
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder="Enter number or name..."
          />

          <span>
            {search
              ? `${filtered.length} found`
              : 'All records'}
          </span>

        </div>


        {search ? (

          <ResultList
            items={filtered}
            onEdit={onEdit}
            onDelete={onDelete}
          />

        ) : (

          <div className="searchHint">

            <Search size={28} />

            <div>

              <b>
                Search is ready
              </b>

              <span>
                Type a number or name above.
              </span>

            </div>

          </div>

        )}

      </section>


      {/* ALL LOCATIONS */}

      <div className="sectionHead">

        <h2>
          All Locations
        </h2>

        <span>
          {locations.length} locations
        </span>

      </div>


      <div className="locationStrip">

        {locations.map(
          ([name, records]) => (

            <button
              className="miniLocation"
              key={name}
              onClick={() =>
                onLocation(name)
              }
            >

              <MapPin size={17} />

              <div>

                <b>
                  {name}
                </b>

                <span>
                  {records.length} murtis
                </span>

              </div>

              <ChevronRight size={16} />

            </button>

          )
        )}


        {!locations.length && (

          <div className="emptySmall">
            No locations yet.
          </div>

        )}

      </div>


      <div className="utilityRow">

        <button
          className="secondary"
          onClick={onAdd}
        >
          <PackagePlus size={17} />
          Add Murti
        </button>


        <button
          className="dangerOutline"
          onClick={onClear}
        >
          <Trash2 size={17} />
          Clear all data
        </button>

      </div>

    </div>

  );
}


/* =====================================================
   LOCATION DETAILS
===================================================== */

function LocationDetails({
  location,
  items,
  onBack,
  onEdit,
  onDelete
}) {

  const locationItems = items.filter(
    item =>
      String(item.location || '').trim()
        .toLowerCase() ===
      String(location || '').trim()
        .toLowerCase()
  );


  return (

    <div className="content locationDetails">

      <button
        className="backButton"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Back to Locations
      </button>


      <div className="locationDetailHero">

        <div className="locationBigIcon">

          <MapPin size={30} />

        </div>

        <div>

          <span className="kicker">
            STORAGE LOCATION
          </span>

          <h2>
            {location}
          </h2>

          <p>
            {locationItems.length}{' '}
            {locationItems.length === 1
              ? 'Murti'
              : 'Murtis'} stored here
          </p>

        </div>

      </div>


      <div className="numberHeader">

        <div>

          <span className="kicker">
            INVENTORY
          </span>

          <h2>
            All Murti Numbers
          </h2>

        </div>

        <div className="numberCount">
          {locationItems.length}
        </div>

      </div>


      {locationItems.length ? (

        <div className="locationNumberGrid">

          {locationItems.map(item => (

            <div
              className="numberCard"
              key={item.id}
            >

              <div className="numberCardTop">

                <div className="numberIcon">
                  <Hash size={17} />
                </div>

                <strong>
                  {item.number}
                </strong>

              </div>


              {item.name && (

                <div className="numberName">
                  {item.name}
                </div>

              )}


              <div className="numberCardActions">

                <button
                  onClick={() =>
                    onEdit(item)
                  }
                >
                  <Edit3 size={15} />
                  Edit
                </button>


                <button
                  className="deleteAction"
                  onClick={() =>
                    onDelete(item.id)
                  }
                >
                  <Trash2 size={15} />
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>

      ) : (

        <div className="empty">

          <Warehouse size={35} />

          <b>
            No murtis found
          </b>

          <span>
            This location currently has no
            murti records.
          </span>

        </div>

      )}

    </div>

  );
}


/* =====================================================
   STAT
===================================================== */

function Stat({
  icon,
  label,
  value
}) {

  return (

    <div className="card">

      <div className="statIcon">
        {icon}
      </div>

      <span>
        {label}
      </span>

      <b>
        {value}
      </b>

    </div>

  );
}


/* =====================================================
   RESULTS
===================================================== */

function ResultList({
  items,
  onEdit,
  onDelete
}) {

  return (

    <div className="results">

      {items.length ? (

        items.map(item => (

          <Result
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />

        ))

      ) : (

        <div className="emptySearch">

          <Search size={28} />

          <div>

            <b>
              No matching record
            </b>

            <span>
              Try another number or name.
            </span>

          </div>

        </div>

      )}

    </div>

  );
}


function Result({
  item,
  onEdit,
  onDelete
}) {

  return (

    <div className="result">

      <div className="resultMain">

        <div className="resultNumber">
          {item.number}
        </div>

        <div className="resultLocation">

          <MapPin size={18} />

          {item.location}

        </div>

        {item.name && (

          <div className="resultName">
            {item.name}
          </div>

        )}

      </div>


      <div className="resultActions">

        <button
          className="iconBtn"
          title="Edit"
          onClick={() =>
            onEdit(item)
          }
        >
          <Edit3 size={17} />
        </button>


        <button
          className="iconBtn delete"
          title="Delete"
          onClick={() =>
            onDelete(item.id)
          }
        >
          <Trash2 size={17} />
        </button>

      </div>

    </div>

  );
}


/* =====================================================
   SEARCH PAGE
===================================================== */

function SearchPage({
  search,
  setSearch,
  filtered,
  loading,
  onEdit,
  onDelete
}) {

  return (

    <div className="content searchPage">

      <div className="searchPageHeader">

        <span className="kicker">
          IMPORTANT SEARCH
        </span>

        <h2>
          Find Murti
        </h2>

        <p>
          Search using number or name.
        </p>

      </div>


      <div className="searchPageBox">

        <Search size={22} />

        <input
          autoFocus
          value={search}
          onChange={e =>
            setSearch(e.target.value)
          }
          placeholder="Search number or name..."
        />

        {search && (

          <button
            className="clearSearch"
            onClick={() =>
              setSearch('')
            }
          >
            <X size={18} />
          </button>

        )}

      </div>


      {loading ? (

        <Loading />

      ) : search.trim() ? (

        <div className="searchOnlyResults">

          <div className="searchCount">
            {filtered.length} result
            {filtered.length === 1
              ? ''
              : 's'} found
          </div>

          <ResultList
            items={filtered}
            onEdit={onEdit}
            onDelete={onDelete}
          />

        </div>

      ) : (

        <div className="searchBlank">

          <Search size={46} />

          <b>
            Search a murti
          </b>

          <span>
            Enter a number or name above.
          </span>

        </div>

      )}

    </div>

  );
}


/* =====================================================
   INVENTORY
===================================================== */

function Inventory({
  filtered,
  search,
  setSearch,
  loading,
  remove,
  edit
}) {

  return (

    <div className="content">

      <div className="pageIntro">

        <span className="kicker">
          ALL RECORDS
        </span>

        <h2>
          Murti Inventory
        </h2>

        <p>
          Number is required.
          Name is optional.
        </p>

      </div>


      <div className="searchPanel">

        <Search size={20} />

        <input
          value={search}
          onChange={e =>
            setSearch(e.target.value)
          }
          placeholder="Search by number or name..."
        />

        <span>
          {filtered.length} found
        </span>

      </div>


      {loading ? (

        <Loading />

      ) : (

        <ResultList
          items={filtered}
          onEdit={edit}
          onDelete={remove}
        />

      )}

    </div>

  );
}


/* =====================================================
   LOCATIONS
===================================================== */

function Locations({
  locations,
  onSelect
}) {

  return (

    <div className="content">

      <div className="pageIntro">

        <span className="kicker">
          ORGANIZE
        </span>

        <h2>
          All Locations
        </h2>

        <p>
          Every location shows its total
          stored murtis and numbers.
        </p>

      </div>


      <div className="locationGrid">

        {locations.map(
          ([name, records]) => (

            <button
              className="locationCard"
              key={name}
              onClick={() =>
                onSelect(name)
              }
            >

              <div className="locationCardIcon">
                <MapPin size={22} />
              </div>


              <div className="locationCardInfo">

                <b>
                  {name}
                </b>

                <span>
                  {records.length}{' '}
                  {records.length === 1
                    ? 'murti'
                    : 'murtis'} stored
                </span>

              </div>


              <ChevronRight />

            </button>

          )
        )}


        {!locations.length && (

          <div className="empty">

            <MapPin size={30} />

            <b>
              No locations added
            </b>

            <span>
              Add a murti and enter its
              location.
            </span>

          </div>

        )}

      </div>

    </div>

  );
}


/* =====================================================
   ADD MURTI MODAL
===================================================== */

function Modal({
  form,
  setForm,
  close,
  save,
  editing,
  saving,
  locations,
  addLocation
}) {

  return (

    <div className="overlay">

      <form
        className="modal"
        onSubmit={save}
      >

        <div className="modalHead">

          <div className="modalTitle">

            <div className="modalLogo">

              <img
                src={APP_LOGO}
                alt=""
              />

            </div>

            <div>

              <b>
                {editing
                  ? 'Edit Murti'
                  : 'Add New Murti'}
              </b>

              <span>
                {editing
                  ? 'Update inventory information'
                  : 'Add a new murti to inventory'}
              </span>

            </div>

          </div>


          <button
            type="button"
            onClick={close}
          >
            <X />
          </button>

        </div>


        <div className="modalBody">

          <label>

            Murti Number *

            <input
              autoFocus
              value={form.number}
              onChange={e =>
                setForm({
                  ...form,
                  number: e.target.value
                })
              }
              placeholder="Example: 1045"
              required
            />

          </label>


          <label>

            Murti Name

            <span className="optional">
              optional
            </span>

            <input
              value={form.name}
              onChange={e =>
                setForm({
                  ...form,
                  name: e.target.value
                })
              }
              placeholder="Example: Ganpati Raja"
            />

          </label>


          <div className="locationField">

            <label>
              Location *
            </label>


            <div className="locationRow">

              <select
                value={form.location}
                onChange={e =>
                  setForm({
                    ...form,
                    location: e.target.value
                  })
                }
                required
              >

                <option value="">
                  Select location
                </option>

                {locations.map(location => (

                  <option
                    key={location.id}
                    value={location.name}
                  >
                    {location.name}
                  </option>

                ))}

              </select>


              <button
                type="button"
                className="addLocationBtn"
                onClick={addLocation}
              >

                <Plus size={17} />

                Add Location

              </button>

            </div>


            <span className="fieldHint">
              Create a location once and
              reuse it for all murtis.
            </span>

          </div>


          <div className="photoNotice">

            <Camera size={18} />

            <div>

              <b>
                Photo
              </b>

              <span>
                Optional. Firebase Storage
                is not enabled in the current setup.
              </span>

            </div>

          </div>

        </div>


        <div className="modalActions">

          <button
            type="button"
            onClick={close}
          >
            Cancel
          </button>


          <button
            className="primary"
            disabled={saving}
          >

            {saving ? (

              <>
                <RefreshCw
                  className="spin"
                  size={16}
                />

                Saving...

              </>

            ) : (

              editing
                ? 'Update Murti'
                : 'Save Murti'

            )}

          </button>

        </div>

      </form>

    </div>

  );
}


/* =====================================================
   LOCATION MODAL
===================================================== */

function LocationModal({
  locations,
  close
}) {

  const [name, setName] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [msg, setMsg] =
    useState('');


  async function saveLocation(e) {

    e.preventDefault();

    const clean =
      name
        .trim()
        .replace(/\s+/g, ' ');

    if (!clean) return;


    if (
      locations.some(
        x =>
          x.name.toLowerCase() ===
          clean.toLowerCase()
      )
    ) {

      setMsg(
        'This location already exists.'
      );

      return;
    }


    setSaving(true);
    setMsg('');


    try {

      await addDoc(
        collection(db, 'locations'),
        {
          name: clean,
          createdAt: serverTimestamp()
        }
      );

      close();

    } catch (e) {

      setMsg(e.message);

    } finally {

      setSaving(false);

    }
  }


  return (

    <div className="overlay overlayTop">

      <form
        className="modal smallModal"
        onSubmit={saveLocation}
      >

        <div className="modalHead">

          <div className="modalTitle">

            <div className="modalLogo">
              <img
                src={APP_LOGO}
                alt=""
              />
            </div>

            <div>

              <b>
                Add Location
              </b>

              <span>
                Create once and reuse.
              </span>

            </div>

          </div>


          <button
            type="button"
            onClick={close}
          >
            <X />

          </button>

        </div>


        <div className="modalBody">

          <label>

            Location Name *

            <input
              autoFocus
              value={name}
              onChange={e =>
                setName(e.target.value)
              }
              placeholder="Example: Main Murti Store"
              required
            />

          </label>


          {msg && (

            <div className="error modalError">

              <AlertTriangle size={16} />

              <span>
                {msg}
              </span>

            </div>

          )}


          <div className="savedLocationPreview">

            <b>
              Saved Locations
            </b>

            {locations.length ? (

              locations.map(location => (

                <span key={location.id}>
                  <MapPin size={13} />
                  {location.name}
                </span>

              ))

            ) : (

              <span>
                No locations yet.
              </span>

            )}

          </div>

        </div>


        <div className="modalActions">

          <button
            type="button"
            onClick={close}
          >
            Cancel
          </button>


          <button
            className="primary"
            disabled={saving}
          >

            {saving
              ? 'Saving...'
              : 'Save Location'}

          </button>

        </div>

      </form>

    </div>

  );
}


/* =====================================================
   DUPLICATE MODAL
===================================================== */

function DuplicateModal({
  duplicates,
  items,
  close
}) {

  return (

    <div className="overlay">

      <div className="modal duplicateModal">

        <div className="modalHead">

          <div>

            <b>
              Duplicate Numbers
            </b>

            <span>
              Numbers entered more than once.
            </span>

          </div>


          <button onClick={close}>
            <X />
          </button>

        </div>


        <div className="duplicateList">

          {duplicates.length ? (

            duplicates.map(
              ([number, count]) => {

                const records =
                  items.filter(
                    x =>
                      String(x.number).trim() ===
                      number
                  );


                return (

                  <div
                    className="duplicateItem"
                    key={number}
                  >

                    <div className="duplicateNumber">
                      {number}
                    </div>

                    <b>
                      {count} entries
                    </b>


                    <div className="duplicateLocations">

                      {records.map(item => (

                        <span key={item.id}>

                          <MapPin size={14} />

                          {item.location}

                        </span>

                      ))}

                    </div>

                  </div>

                );

              }
            )

          ) : (

            <div className="empty">
              No duplicate numbers.
            </div>

          )}

        </div>


        <div className="modalActions">

          <button
            className="primary"
            onClick={close}
          >
            Done
          </button>

        </div>

      </div>

    </div>

  );
}


/* =====================================================
   LOADING
===================================================== */

function Loading() {

  return (

    <div className="empty">

      <RefreshCw
        className="spin"
        size={24}
      />

      <span>
        Loading inventory...
      </span>

    </div>

  );

}


/* =====================================================
   GLOBAL LOADER
===================================================== */

function GlobalLoader({ text }) {

  return (

    <div className="globalLoader">

      <div className="loaderCard">

        <RefreshCw
          className="spin"
          size={24}
        />

        <b>
          {text}
        </b>

        <span>
          Please wait...
        </span>

      </div>

    </div>

  );
}


/* =====================================================
   LOGIN
===================================================== */

function LoginModal({
  login,
  setLogin,
  close,
  save,
  error
}) {

  return (

    <div className="overlay">

      <form
        className="modal loginModal"
        onSubmit={save}
      >

        <div className="modalHead">

          <div className="modalTitle">

            <div className="modalLogo">

              <img
                src={APP_LOGO}
                alt=""
              />

            </div>

            <div>

              <b>
                Admin Login
              </b>

              <span>
                Sign in to manage inventory.
              </span>

            </div>

          </div>


          <button
            type="button"
            onClick={close}
          >
            <X />
          </button>

        </div>


        {error && (

          <div className="loginError">

            <AlertTriangle size={16} />

            {error}

          </div>

        )}


        <label>

          Email

          <input
            type="email"
            value={login.email}
            onChange={e =>
              setLogin({
                ...login,
                email: e.target.value
              })
            }
            required
          />

        </label>


        <label>

          Password

          <input
            type="password"
            value={login.password}
            onChange={e =>
              setLogin({
                ...login,
                password: e.target.value
              })
            }
            required
          />

        </label>


        <div className="modalActions">

          <button
            type="button"
            onClick={close}
          >
            Cancel
          </button>

          <button className="primary">
            Sign in
          </button>

        </div>

      </form>

    </div>

  );
}


createRoot(
  document.getElementById('root')
).render(
  <App />
);





if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(error => {
        console.error(
          'Service Worker registration failed:',
          error
        );
      });
  });
}