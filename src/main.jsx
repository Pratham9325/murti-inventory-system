import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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
  writeBatch,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, auth } from "./firebase";
import {
  Search,
  Plus,
  LayoutDashboard,
  Boxes,
  MapPin,
  Trash2,
  X,
  Edit3,
  LogOut,
  UserRound,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  SearchX,
} from "lucide-react";
import "./style.css";

const emptyForm = {
  number: "",
  name: "",
  location: "",
};

function App() {
  const [authUser, setAuthUser] = useState(null);

  const [items, setItems] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [tab, setTab] = useState("dashboard");

  const [showAdd, setShowAdd] = useState(false);
  const [showLocationAdd, setShowLocationAdd] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);

  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });

    return () => unsub();
  }, []);

  /* ---------------- FIREBASE DATA ---------------- */

  useEffect(() => {
    if (!authUser) {
      setItems([]);
      setSavedLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const murtiQuery = query(
      collection(db, "murtis"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeMurtis = onSnapshot(
      murtiQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setItems(data);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setError(getFirebaseError(err));
      }
    );

    const unsubscribeLocations = onSnapshot(
      collection(db, "locations"),
      (snapshot) => {
        const data = snapshot.docs
          .map((item) => ({
            id: item.id,
            name: item.data().name || "",
          }))
          .filter((item) => item.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        setSavedLocations(data);
      },
      (err) => {
        setError(getFirebaseError(err));
      }
    );

    return () => {
      unsubscribeMurtis();
      unsubscribeLocations();
    };
  }, [authUser]);

  /* ---------------- SEARCH ---------------- */

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return items;

    return items.filter((item) => {
      const number = String(item.number || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();

      return number.includes(value) || name.includes(value);
    });
  }, [items, search]);

  /* ---------------- LOCATIONS ---------------- */

  const locations = useMemo(() => {
    const map = {};

    items.forEach((item) => {
      const location = String(item.location || "Unknown").trim();

      if (!map[location]) {
        map[location] = 0;
      }

      map[location]++;
    });

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  /* ---------------- DUPLICATES ---------------- */

  const duplicateGroups = useMemo(() => {
    const map = {};

    items.forEach((item) => {
      const number = String(item.number || "").trim();

      if (!number) return;

      if (!map[number]) {
        map[number] = [];
      }

      map[number].push(item);
    });

    return Object.entries(map)
      .filter(([, records]) => records.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  /* ---------------- HELPERS ---------------- */

  function showToast(message, type = "success") {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowAdd(true);
  }

  function openEdit(item) {
    setEditing(item);

    setForm({
      number: item.number || "",
      name: item.name || "",
      location: item.location || "",
    });

    setShowAdd(true);
  }

  function openSearch() {
    setSearchOpen(true);
    setSearch("");
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
  }

  function openDuplicate(number, records) {
    setSelectedDuplicate({
      number,
      records,
    });

    setDuplicateOpen(true);
  }

  /* ---------------- SAVE MURTI ---------------- */

  async function saveMurti(event) {
    event.preventDefault();

    const number = form.number.trim();
    const name = form.name.trim();
    const location = form.location.trim();

    if (!number) {
      setError("Murti number is required.");
      return;
    }

    if (!location) {
      setError("Please select a location.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const data = {
        number,
        name,
        location,
      };

      if (editing) {
        await updateDoc(doc(db, "murtis", editing.id), data);

        showToast("Murti updated successfully.");
      } else {
        await addDoc(collection(db, "murtis"), {
          ...data,
          createdAt: serverTimestamp(),
        });

        showToast("Murti saved successfully.");
      }

      setForm(emptyForm);
      setEditing(null);
      setShowAdd(false);
      setTab("inventory");
    } catch (err) {
      setError(getFirebaseError(err));
      showToast("Unable to save murti.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- DELETE ---------------- */

  async function removeMurti(id) {
    const confirmed = window.confirm(
      "Delete this murti record?\n\nThis action cannot be undone."
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      await deleteDoc(doc(db, "murtis", id));

      showToast("Murti deleted.");
    } catch (err) {
      setError(getFirebaseError(err));
      showToast("Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------- CLEAR ALL ---------------- */

  async function clearAll() {
    if (!items.length && !savedLocations.length) {
      showToast("There is no data to clear.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Delete all inventory data?\n\nMurtis: ${items.length}\nLocations: ${savedLocations.length}\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const batch = writeBatch(db);

      items.forEach((item) => {
        batch.delete(doc(db, "murtis", item.id));
      });

      savedLocations.forEach((location) => {
        batch.delete(doc(db, "locations", location.id));
      });

      await batch.commit();

      setSearch("");
      showToast("All inventory data cleared.");
    } catch (err) {
      setError(getFirebaseError(err));
      showToast("Unable to clear data.", "error");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------- LOGIN ---------------- */

  async function doLogin(event) {
    event.preventDefault();

    setLoginError("");

    try {
      await signInWithEmailAndPassword(
        auth,
        login.email,
        login.password
      );

      setShowLogin(false);

      setLogin({
        email: "",
        password: "",
      });

      showToast("Login successful.");
    } catch (err) {
      setLoginError(getFirebaseError(err));
    }
  }

  /* ---------------- LOGGED OUT ---------------- */

  if (!authUser) {
    return (
      <>
        <LoginScreen
          openLogin={() => setShowLogin(true)}
        />

        {showLogin && (
          <LoginModal
            login={login}
            setLogin={setLogin}
            close={() => setShowLogin(false)}
            save={doLogin}
            error={loginError}
          />
        )}
      </>
    );
  }

  /* ---------------- APP ---------------- */

  return (
    <div className="app">

      {/* DESKTOP SIDEBAR */}

      <aside className="sidebar">
        <Brand />

        <Nav
          tab={tab}
          setTab={setTab}
        />

        <div className="sideBottom">
          <div className="userBox">
            <UserRound size={17} />

            <span>
              {authUser.email}
            </span>
          </div>

          <button
            className="ghostBtn"
            onClick={() => signOut(auth)}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main>

        <header>
          <div>
            <div className="eyebrow">
              GANPATI INVENTORY
            </div>

            <h1>
              {tab === "dashboard"
                ? "Dashboard"
                : tab === "inventory"
                ? "Inventory"
                : "Locations"}
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
              <Plus size={18} />
              Add Murti
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="error">
            <AlertTriangle size={17} />

            <span>{error}</span>

            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* CONTENT */}

        {tab === "dashboard" && (
          <Dashboard
            items={items}
            locations={locations}
            duplicateGroups={duplicateGroups}
            loading={loading}
            onAdd={openAdd}
            onClear={clearAll}
            onSearch={openSearch}
            onDuplicate={openDuplicate}
            onEdit={openEdit}
            onDelete={removeMurti}
          />
        )}

        {tab === "inventory" && (
          <Inventory
            items={items}
            filtered={filtered}
            search={search}
            setSearch={setSearch}
            loading={loading}
            onEdit={openEdit}
            onDelete={removeMurti}
          />
        )}

        {tab === "locations" && (
          <Locations
            locations={locations}
            onSelect={(location) => {
              setSearch(location);
              setTab("inventory");
            }}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}

      <MobileBottomNav
        tab={tab}
        setTab={setTab}
        onSearch={openSearch}
        onAdd={openAdd}
      />

      {/* ADD / EDIT */}

      {showAdd && (
        <MurtiModal
          form={form}
          setForm={setForm}
          locations={savedLocations}
          editing={!!editing}
          saving={saving}
          close={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          save={saveMurti}
          addLocation={() => setShowLocationAdd(true)}
        />
      )}

      {/* ADD LOCATION */}

      {showLocationAdd && (
        <LocationModal
          locations={savedLocations}
          saving={locationSaving}
          setSaving={setLocationSaving}
          close={() => setShowLocationAdd(false)}
          onSaved={(location) => {
            setForm((old) => ({
              ...old,
              location,
            }));
          }}
        />
      )}

      {/* SEARCH FULL MOBILE SCREEN */}

      {searchOpen && (
        <SearchScreen
          search={search}
          setSearch={setSearch}
          results={filtered}
          loading={loading}
          close={closeSearch}
          onEdit={openEdit}
          onDelete={removeMurti}
        />
      )}

      {/* DUPLICATES */}

      {duplicateOpen && selectedDuplicate && (
        <DuplicateModal
          number={selectedDuplicate.number}
          records={selectedDuplicate.records}
          close={() => {
            setDuplicateOpen(false);
            setSelectedDuplicate(null);
          }}
          onEdit={openEdit}
          onDelete={removeMurti}
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

      {/* LOADER */}

      {deleting && (
        <FullScreenLoader text="Processing..." />
      )}

      {/* TOAST */}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
        />
      )}
    </div>
  );
}

/* =========================================================
   BRAND
========================================================= */

function Brand() {
  return (
    <div className="brand">
      <div className="brandIcon">
        M
      </div>

      <div>
        <b>Murti</b>
        <span>Inventory</span>
      </div>
    </div>
  );
}

/* =========================================================
   NAV
========================================================= */

function Nav({ tab, setTab }) {
  return (
    <div className="navlinks">

      <button
        className={tab === "dashboard" ? "active" : ""}
        onClick={() => setTab("dashboard")}
      >
        <LayoutDashboard size={19} />
        Dashboard
      </button>

      <button
        className={tab === "inventory" ? "active" : ""}
        onClick={() => setTab("inventory")}
      >
        <Boxes size={19} />
        Inventory
      </button>

      <button
        className={tab === "locations" ? "active" : ""}
        onClick={() => setTab("locations")}
      >
        <MapPin size={19} />
        Locations
      </button>

    </div>
  );
}

/* =========================================================
   MOBILE NAV
========================================================= */

function MobileBottomNav({
  tab,
  setTab,
  onSearch,
  onAdd,
}) {
  return (
    <nav className="mobileBottom">

      <button
        className={tab === "dashboard" ? "active" : ""}
        onClick={() => setTab("dashboard")}
      >
        <LayoutDashboard />
        <span>Home</span>
      </button>

      <button
        onClick={onSearch}
      >
        <Search />
        <span>Search</span>
      </button>

      <button
        className="addNavButton"
        onClick={onAdd}
      >
        <Plus />
        <span>Add</span>
      </button>

      <button
        className={tab === "inventory" ? "active" : ""}
        onClick={() => setTab("inventory")}
      >
        <Boxes />
        <span>Inventory</span>
      </button>

      <button
        className={tab === "locations" ? "active" : ""}
        onClick={() => setTab("locations")}
      >
        <MapPin />
        <span>Locations</span>
      </button>

    </nav>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  items,
  locations,
  duplicateGroups,
  loading,
  onAdd,
  onClear,
  onSearch,
  onDuplicate,
  onEdit,
  onDelete,
}) {
  return (
    <div className="content">

      <section className="hero">
        <div>
          <p>Total Murtis</p>

          <strong>
            {loading ? "—" : items.length}
          </strong>

          <small>
            All inventory records
          </small>
        </div>

        <div className="heroOrb">
          ◈
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
          className="card duplicateCard"
          onClick={() => {
            if (duplicateGroups.length) {
              onDuplicate(
                duplicateGroups[0][0],
                duplicateGroups[0][1]
              );
            }
          }}
        >
          <div className="statIcon">
            <Copy />
          </div>

          <span>
            Duplicate Numbers
          </span>

          <b>
            {duplicateGroups.length}
          </b>

          <small className="cardHint">
            Click to view numbers
          </small>
        </button>

      </div>

      {/* MOBILE SEARCH ENTRY */}

      <section className="mobileSearchEntry">
        <button onClick={onSearch}>
          <Search size={21} />

          <div>
            <b>Search Murti</b>
            <span>
              Search by number or name
            </span>
          </div>

          <ChevronRight size={19} />
        </button>
      </section>

      {/* DESKTOP SEARCH */}

      <section className="desktopSearchFeature">

        <div className="sectionTitle">
          <div>
            <span className="kicker">
              FAST SEARCH
            </span>

            <h2>
              Find a Murti
            </h2>

            <p>
              Search by number or name. Name is optional.
            </p>
          </div>
        </div>

        <button
          className="largeSearchButton"
          onClick={onSearch}
        >
          <Search size={21} />

          <span>
            Search by number or name...
          </span>

          <ChevronRight size={18} />
        </button>

      </section>

      {/* LOCATIONS */}

      <div className="sectionHead">
        <h2>Locations</h2>

        <span>
          {locations.length} locations
        </span>
      </div>

      <div className="locationStrip">

        {locations.slice(0, 4).map(([name, count]) => (
          <div
            className="miniLocation"
            key={name}
          >
            <MapPin size={17} />

            <div>
              <b>{name}</b>

              <span>
                {count} {count === 1 ? "murti" : "murtis"}
              </span>
            </div>
          </div>
        ))}

        {!locations.length && (
          <div className="emptySmall">
            No locations yet.
          </div>
        )}

      </div>

      {/* DUPLICATES LIST */}

      <section className="duplicateSection">

        <div className="sectionHead">
          <h2>Duplicate Numbers</h2>

          <span>
            {duplicateGroups.length}
          </span>
        </div>

        {duplicateGroups.length ? (
          <div className="duplicateList">

            {duplicateGroups.map(([number, records]) => (
              <button
                className="duplicateItem"
                key={number}
                onClick={() =>
                  onDuplicate(number, records)
                }
              >
                <div>
                  <b>{number}</b>

                  <span>
                    {records.length} records
                  </span>
                </div>

                <ChevronRight size={18} />
              </button>
            ))}

          </div>
        ) : (
          <div className="emptySmall">
            No duplicate numbers.
          </div>
        )}

      </section>

      <div className="utilityRow">

        <button
          className="secondary"
          onClick={onAdd}
        >
          <Plus size={17} />
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

/* =========================================================
   STAT
========================================================= */

function Stat({
  icon,
  label,
  value,
}) {
  return (
    <div className="card">

      <div className="statIcon">
        {icon}
      </div>

      <span>{label}</span>

      <b>{value}</b>

    </div>
  );
}

/* =========================================================
   INVENTORY
========================================================= */

function Inventory({
  filtered,
  search,
  setSearch,
  loading,
  onEdit,
  onDelete,
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
          Number is required. Name is optional.
          Duplicate numbers are allowed.
        </p>
      </div>

      <div className="inventorySearch">
        <Search size={19} />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by number or name..."
        />

        {search && (
          <span>
            {filtered.length} found
          </span>
        )}
      </div>

      {loading ? (
        <Loading text="Loading inventory..." />
      ) : (
        <ResultList
          items={filtered}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

    </div>
  );
}

/* =========================================================
   RESULT LIST
========================================================= */

function ResultList({
  items,
  onEdit,
  onDelete,
}) {
  if (!items.length) {
    return (
      <div className="emptySearch">
        <SearchX size={32} />

        <b>No matching murti</b>

        <span>
          Try another number or name.
        </span>
      </div>
    );
  }

  return (
    <div className="results">

      {items.map((item) => (
        <Result
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

    </div>
  );
}

/* =========================================================
   RESULT
========================================================= */

function Result({
  item,
  onEdit,
  onDelete,
}) {
  return (
    <div className="result">

      <div className="resultMain">

        <div className="resultNumber">
          {item.number}
        </div>

        {item.name && (
          <div className="resultName">
            {item.name}
          </div>
        )}

        <div className="resultLocation">
          <MapPin size={17} />
          {item.location}
        </div>

      </div>

      <div className="resultActions">

        <button
          className="iconBtn"
          title="Edit"
          onClick={() => onEdit(item)}
        >
          <Edit3 size={17} />
        </button>

        <button
          className="iconBtn delete"
          title="Delete"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 size={17} />
        </button>

      </div>

    </div>
  );
}

/* =========================================================
   LOCATIONS
========================================================= */

function Locations({
  locations,
  onSelect,
}) {
  return (
    <div className="content">

      <div className="pageIntro">

        <span className="kicker">
          ORGANIZE
        </span>

        <h2>
          Locations
        </h2>

        <p>
          See how many murtis are stored at each location.
        </p>

      </div>

      <div className="locationGrid">

        {locations.map(([name, count]) => (
          <button
            className="locationCard"
            key={name}
            onClick={() => onSelect(name)}
          >
            <MapPin />

            <div>
              <b>{name}</b>

              <span>
                {count} {count === 1 ? "murti" : "murtis"}
              </span>
            </div>

            <ChevronRight />
          </button>
        ))}

        {!locations.length && (
          <div className="empty">
            <MapPin size={30} />

            <b>No locations added</b>

            <span>
              Add a murti and select a location.
            </span>
          </div>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   MOBILE SEARCH SCREEN
========================================================= */

function SearchScreen({
  search,
  setSearch,
  results,
  loading,
  close,
  onEdit,
  onDelete,
}) {
  return (
    <div className="searchScreen">

      <div className="searchScreenHeader">

        <button
          className="backButton"
          onClick={close}
        >
          <ArrowLeft size={21} />
        </button>

        <div>
          <b>Search</b>
          <span>Find Murti</span>
        </div>

      </div>

      <div className="searchScreenInput">

        <Search size={21} />

        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search number or name..."
        />

        {search && (
          <button
            className="clearSearch"
            onClick={() => setSearch("")}
          >
            <X size={17} />
          </button>
        )}

      </div>

      <div className="searchResultsArea">

        {!search.trim() ? (
          <div className="searchBlank">
            <Search size={42} />

            <b>Search your inventory</b>

            <span>
              Enter a murti number or name
            </span>
          </div>
        ) : loading ? (
          <Loading text="Searching..." />
        ) : (
          <div className="searchOnlyResults">

            {results.length ? (
              results.map((item) => (
                <Result
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <div className="searchBlank">
                <SearchX size={42} />

                <b>No murti found</b>

                <span>
                  Try another number or name.
                </span>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   ADD / EDIT MURTI MODAL
========================================================= */

function MurtiModal({
  form,
  setForm,
  locations,
  editing,
  saving,
  close,
  save,
  addLocation,
}) {
  return (
    <div className="overlay">

      <form
        className="modal"
        onSubmit={save}
      >

        <div className="modalHead">

          <div>
            <b>
              {editing ? "Edit Murti" : "Add Murti"}
            </b>

            <span>
              {editing
                ? "Update inventory record"
                : "Create a new inventory record"}
            </span>
          </div>

          <button
            type="button"
            onClick={close}
          >
            <X />
          </button>

        </div>

        <label>
          Murti Number *

          <input
            autoFocus
            value={form.number}
            onChange={(e) =>
              setForm({
                ...form,
                number: e.target.value,
              })
            }
            placeholder="e.g. 1045"
            required
          />
        </label>

        <label>
          Murti Name{" "}
          <span className="optional">
            (optional)
          </span>

          <input
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            placeholder="e.g. Ganpati Raja"
          />
        </label>

        <div className="locationField">

          <label>
            Location *
          </label>

          <div className="locationRow">

            <select
              value={form.location}
              onChange={(e) =>
                setForm({
                  ...form,
                  location: e.target.value,
                })
              }
              required
            >
              <option value="">
                Select saved location
              </option>

              {locations.map((location) => (
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
            Save a location once and reuse it.
          </span>

        </div>

        <div className="photoNotice">

          <div>
            <b>Photo</b>

            <span>
              Photo can be added later when cloud storage
              is enabled.
            </span>
          </div>

        </div>

        <div className="modalActions">

          <button
            type="button"
            onClick={close}
            disabled={saving}
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
                  size={17}
                  className="spin"
                />

                Saving...
              </>
            ) : editing ? (
              "Update Murti"
            ) : (
              "Save Murti"
            )}
          </button>

        </div>

      </form>

    </div>
  );
}

/* =========================================================
   LOCATION MODAL
========================================================= */

function LocationModal({
  locations,
  saving,
  setSaving,
  close,
  onSaved,
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function saveLocation(event) {
    event.preventDefault();

    const clean = name
      .trim()
      .replace(/\s+/g, " ");

    if (!clean) {
      setMessage("Location name is required.");
      return;
    }

    const exists = locations.some(
      (location) =>
        location.name.toLowerCase() ===
        clean.toLowerCase()
    );

    if (exists) {
      setMessage(
        "This location already exists. Select it from the list."
      );

      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await addDoc(
        collection(db, "locations"),
        {
          name: clean,
          createdAt: serverTimestamp(),
        }
      );

      onSaved(clean);

      showGlobalToast("Location added successfully.");

      close();
    } catch (err) {
      setMessage(getFirebaseError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay">

      <form
        className="modal smallModal"
        onSubmit={saveLocation}
      >

        <div className="modalHead">

          <div>
            <b>Add Location</b>

            <span>
              Create once and reuse everywhere.
            </span>
          </div>

          <button
            type="button"
            onClick={close}
          >
            <X />
          </button>

        </div>

        <label>
          Location Name *

          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Room A"
            required
          />
        </label>

        {message && (
          <div className="error">
            <AlertTriangle size={16} />

            <span>{message}</span>
          </div>
        )}

        <div className="savedLocationPreview">

          <b>
            Saved locations
          </b>

          {locations.length ? (
            locations.slice(0, 8).map((location) => (
              <span key={location.id}>
                • {location.name}
              </span>
            ))
          ) : (
            <span>
              No locations yet.
            </span>
          )}

        </div>

        <div className="modalActions">

          <button
            type="button"
            onClick={close}
            disabled={saving}
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
                  size={17}
                  className="spin"
                />

                Saving...
              </>
            ) : (
              "Save Location"
            )}
          </button>

        </div>

      </form>

    </div>
  );
}

/* =========================================================
   DUPLICATE MODAL
========================================================= */

function DuplicateModal({
  number,
  records,
  close,
  onEdit,
  onDelete,
}) {
  return (
    <div className="overlay">

      <div className="modal">

        <div className="modalHead">

          <div>
            <b>
              Duplicate Number
            </b>

            <span>
              All records with this number
            </span>
          </div>

          <button onClick={close}>
            <X />
          </button>

        </div>

        <div className="duplicateNumberHero">
          {number}
          <span>
            {records.length} records
          </span>
        </div>

        <div className="duplicateRecords">

          {records.map((record) => (
            <div
              className="duplicateRecord"
              key={record.id}
            >
              <div>
                <strong>
                  {record.number}
                </strong>

                {record.name && (
                  <span>
                    {record.name}
                  </span>
                )}

                <small>
                  <MapPin size={14} />
                  {record.location}
                </small>
              </div>

              <div className="resultActions">

                <button
                  className="iconBtn"
                  onClick={() => onEdit(record)}
                >
                  <Edit3 size={16} />
                </button>

                <button
                  className="iconBtn delete"
                  onClick={() => onDelete(record.id)}
                >
                  <Trash2 size={16} />
                </button>

              </div>
            </div>
          ))}

        </div>

        <div className="modalActions">

          <button onClick={close}>
            Close
          </button>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   LOGIN SCREEN
========================================================= */

function LoginScreen({
  openLogin,
}) {
  return (
    <div className="loginScreen">

      <div className="loginCard">

        <div className="brandIcon big">
          M
        </div>

        <span className="kicker">
          MURTI INVENTORY
        </span>

        <h1>
          Welcome back
        </h1>

        <p>
          Sign in to manage your Murti inventory.
        </p>

        <button
          className="primary full"
          onClick={openLogin}
        >
          <UserRound size={18} />
          Admin Login
        </button>

        <div className="loginNote">
          <CheckCircle2 size={16} />
          Firebase secured inventory
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   LOGIN MODAL
========================================================= */

function LoginModal({
  login,
  setLogin,
  close,
  save,
  error,
}) {
  return (
    <div className="overlay">

      <form
        className="modal"
        onSubmit={save}
      >

        <div className="modalHead">

          <div>
            <b>
              Admin Login
            </b>

            <span>
              Firebase Email / Password
            </span>
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
            onChange={(e) =>
              setLogin({
                ...login,
                email: e.target.value,
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
            onChange={(e) =>
              setLogin({
                ...login,
                password: e.target.value,
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

/* =========================================================
   LOADING
========================================================= */

function Loading({
  text = "Loading...",
}) {
  return (
    <div className="loadingBox">

      <RefreshCw
        className="spin"
        size={24}
      />

      <span>{text}</span>

    </div>
  );
}

/* =========================================================
   FULL SCREEN LOADER
========================================================= */

function FullScreenLoader({
  text,
}) {
  return (
    <div className="processingOverlay">

      <div className="processingCard">

        <RefreshCw
          size={32}
          className="spin"
        />

        <b>{text}</b>

        <span>
          Please wait...
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   TOAST
========================================================= */

function Toast({
  message,
  type,
}) {
  return (
    <div
      className={`toast ${
        type === "error"
          ? "toastError"
          : ""
      }`}
    >
      {type === "error" ? (
        <AlertTriangle size={18} />
      ) : (
        <CheckCircle2 size={18} />
      )}

      <span>{message}</span>
    </div>
  );
}

/* =========================================================
   GLOBAL TOAST
========================================================= */

let globalToastHandler = null;

function showGlobalToast(message) {
  if (globalToastHandler) {
    globalToastHandler(message);
  }
}

/* =========================================================
   FIREBASE ERROR
========================================================= */

function getFirebaseError(error) {
  if (!error) {
    return "Something went wrong.";
  }

  if (
    error.code ===
    "permission-denied"
  ) {
    return "Firebase permission denied. Check Firestore Rules and login.";
  }

  if (
    error.code ===
    "auth/invalid-credential"
  ) {
    return "Invalid email or password.";
  }

  if (
    error.code ===
    "auth/user-not-found"
  ) {
    return "User not found.";
  }

  if (
    error.code ===
    "auth/wrong-password"
  ) {
    return "Incorrect password.";
  }

  return error.message || "Something went wrong.";
}

/* =========================================================
   TOAST BRIDGE
========================================================= */

function ToastBridge() {
  return null;
}

/* =========================================================
   PATCH GLOBAL TOAST HANDLER
========================================================= */

function ToastController() {
  return null;
}

/* =========================================================
   ROOT
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <AppWithToast />
);

/* =========================================================
   APP WITH GLOBAL TOAST
========================================================= */

function AppWithToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    globalToastHandler = (message) => {
      setToast({
        message,
        type: "success",
      });

      setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    return () => {
      globalToastHandler = null;
    };
  }, []);

  return (
    <>
      <App />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
        />
      )}
    </>
  );
}