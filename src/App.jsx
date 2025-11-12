import React, { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
  signInWithCustomToken,
  // --- NEW: Import persistence functions ---
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { setLogLevel } from "firebase/firestore";

// --- Firebase Configuration ---
// Read keys from Vercel/Netlify Environment Variables
// --- FIX: Fallback to hardcoded keys if 'process' is not defined (e.g., in CodeSandbox) ---
const hardcodedConfig = {
  apiKey: "AIzaSyAmKlAsjEwciV_I1lIkv8fhHWZSAQtYMck",
  authDomain: "anilog-10335.firebaseapp.com",
  projectId: "anilog-10335",
  storageBucket: "anilog-10335.firebasestorage.app",
  messagingSenderId: "762689050013",
  appId: "1:762689050013:web:5507e5a56c1c093e46cb74",
  measurementId: "G-S52EP9TP27",
};

const firebaseConfig = {
  apiKey:
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      : hardcodedConfig.apiKey,
  authDomain: hardcodedConfig.authDomain,
  projectId: hardcodedConfig.projectId,
  storageBucket: hardcodedConfig.storageBucket,
  messagingSenderId: hardcodedConfig.messagingSenderId,
  appId:
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      : hardcodedConfig.appId,
  measurementId: hardcodedConfig.measurementId,
};

// Use your specific appId for database paths
// Fallback for local development if env var isn't set
const appId =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    : hardcodedConfig.appId;

// --- App Name ---
const APP_NAME = "AniLog"; // Change this to your new app name!

// --- Initialize Firebase ---
let app;
let auth;
let db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  setLogLevel("debug"); // Optional: for detailed Firestore logging
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// --- Kitsu API Configuration ---
const KITSU_API_URL = "https://kitsu.io/api/edge";

// --- SVG Icons ---
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4z"
    />
  </svg>
);

const FriendsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

// --- NEW: Discover Icon ---
const DiscoverIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

// --- NEW: Play/Trailer Icon ---
const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-2"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
      clipRule="evenodd"
    />
  </svg>
);

// --- Main App Component ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(""); // State for public username
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home"); // home, search, friends, profile

  // --- Animation Styles ---
  // Inject custom animation keyframes into the document head
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slide-up {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0px); opacity: 1; }
      }
      .fade-in { animation: fade-in 0.3s ease-out forwards; }
      .slide-up { animation: slide-up 0.3s ease-out forwards; }
      
      /* --- Hide number input arrows --- */
      /* For Chrome, Safari, Edge, Opera */
      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      /* For Firefox */
      input[type=number] {
        -moz-appearance: textfield;
      }

      /* --- 3D Card Hover Style --- */
      .anime-card {
        transition: transform 0.3s ease-out;
        transform-style: preserve-3d;
      }
      .anime-card .anime-card-light {
        transition: opacity 0.3s ease-out;
        opacity: 0;
        pointer-events: none;
        background: radial-gradient(circle at var(--light-x) var(--light-y), rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 50%);
      }
      .anime-card:hover {
        /* Handled by JS */
      }
      .anime-card:hover .anime-card-light {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // --- Auth Initialization ---
  // Runs once on mount to check auth status
  useEffect(() => {
    // --- NEW: Set persistence before doing anything else ---
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        // Persistence set, now initialize auth
        const initializeAuth = async () => {
          try {
            // Try to sign in with the provided token first
            if (
              typeof __initial_auth_token !== "undefined" &&
              __initial_auth_token
            ) {
              console.log("Attempting custom token sign-in...");
              await signInWithCustomToken(auth, __initial_auth_token);
            } else if (!auth.currentUser) {
              // Fallback to anonymous sign-in if no token and no current user
              console.log(
                "No custom token or user, attempting anonymous sign-in..."
              );
              await signInAnonymously(auth);
            }
          } catch (error) {
            console.error("Initial sign-in error:", error);
            // If token sign-in fails, force anonymous sign-in
            if (
              error.code === "auth/custom-token-mismatch" ||
              error.code === "auth/invalid-custom-token"
            ) {
              console.warn(
                "Custom token sign-in failed, signing in anonymously."
              );
              try {
                await signInAnonymously(auth);
              } catch (anonError) {
                console.error("Anonymous sign-in fallback failed:", anonError);
              }
            }
          }
        };

        // Set up the listener *before* trying to sign in
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setLoading(true);
          if (user) {
            console.log("Auth state changed, user found:", user.uid);
            setCurrentUser(user);
            setUserId(user.uid);

            // Fetch user profile (username)
            try {
              const userDocRef = doc(
                db,
                `artifacts/${appId}/public/data/users/${user.uid}`
              );
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                // User doc exists, just read the username
                const userData = userDocSnap.data();
                setUsername(
                  userData.username ||
                    (user.email ? user.email.split("@")[0] : "Guest")
                );
              } else if (!user.isAnonymous) {
                // *** THIS IS THE FIX ***
                // If doc doesn't exist and user is NOT anonymous, create it.
                console.log("No user profile doc, creating one...");
                const newUsername = user.email.split("@")[0]; // Default username from email
                await setDoc(userDocRef, {
                  uid: user.uid,
                  email: user.email,
                  username: newUsername,
                  createdAt: serverTimestamp(),
                  friends: [], // Initialize empty friends list
                });
                setUsername(newUsername); // Set the newly created username
              } else {
                // User is anonymous and has no doc
                console.log("User is anonymous, setting username to Guest.");
                setUsername("Guest");
              }
            } catch (error) {
              console.error("Error fetching/creating user profile:", error);
              setUsername(user.email ? user.email.split("@")[0] : "Guest");
            }
          } else {
            console.log("Auth state changed, no user.");
            setCurrentUser(null);
            setUserId(null);
            setUsername("");
          }
          setLoading(false);
        });

        // Run the initialization if there's no user
        if (!auth.currentUser) {
          initializeAuth();
        }

        // Cleanup listener on unmount
        return () => {
          console.log("Cleaning up auth listener.");
          unsubscribe();
        };
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs only once

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // After sign out, onAuthStateChanged will set user to null
      // We also sign in anonymously to keep the app functional
      await signInAnonymously(auth);
      setPage("home"); // Go to home after logout
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading || !db) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading {APP_NAME}...
      </div>
    );
  }

  // If not logged in (and not anonymous), show Auth page
  if (!currentUser || currentUser.isAnonymous) {
    return <AuthPage db={db} setPage={setPage} />;
  }

  // --- Main App Navigation ---
  const renderPage = () => {
    switch (page) {
      case "home":
        return <HomePage db={db} userId={userId} username={username} />;
      case "search":
        return <SearchPage db={db} userId={userId} />;
      // --- Add Discover Page ---
      case "discover":
        return <DiscoverPage db={db} userId={userId} />;
      case "friends":
        return <FriendsPage db={db} userId={userId} username={username} />;
      case "profile":
        return (
          <ProfilePage
            db={db}
            userId={userId}
            currentUser={currentUser}
            username={username}
            setUsername={setUsername}
          />
        );
      default:
        return <HomePage db={db} userId={userId} username={username} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/70 backdrop-blur-md shadow-lg border-b border-gray-700/50">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setPage("profile")}
              title="Profile"
              className={`p-2 rounded-full ${
                page === "profile" ? "text-white" : "text-gray-400"
              } hover:text-white hover:bg-gray-700/50 transition-colors`}
            >
              <ProfileIcon />
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
            >
              <LogoutIcon />
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4">{renderPage()}</main>

      {/* Bottom Navigation */}
      <footer className="sticky bottom-0 z-10 bg-gray-900/70 backdrop-blur-md shadow-inner border-t border-gray-700/50">
        <nav className="container mx-auto px-4 py-3 flex justify-around">
          <button
            onClick={() => setPage("home")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              page === "home" ? "text-white" : "text-gray-400"
            } hover:text-white`}
          >
            <HomeIcon />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => setPage("search")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              page === "search" ? "text-white" : "text-gray-400"
            } hover:text-white`}
          >
            <SearchIcon />
            <span className="text-xs">Search</span>
          </button>
          {/* --- Add Discover Button --- */}
          <button
            onClick={() => setPage("discover")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              page === "discover" ? "text-white" : "text-gray-400"
            } hover:text-white`}
          >
            <DiscoverIcon />
            <span className="text-xs">Discover</span>
          </button>
          <button
            onClick={() => setPage("friends")}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              page === "friends" ? "text-white" : "text-gray-400"
            } hover:text-white`}
          >
            <FriendsIcon />
            <span className="text-xs">Friends</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}

// --- Authentication Page Component ---
function AuthPage({ db, setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // For sign-up
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      // --- Handle Login ---
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest
        setPage("home"); // Optimistically set page
      } catch (err) {
        console.error("Login error:", err.code, err.message);
        setError(err.message);
      }
    } else {
      // --- Handle Sign Up ---
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (!username.trim()) {
        setError("Please enter a username.");
        return;
      }

      try {
        // Check if username is already taken
        const usersRef = collection(db, `artifacts/${appId}/public/data/users`);
        const q = query(
          usersRef,
          where("username", "==", username.trim()),
          limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setError(
            "This username is already taken. Please choose another one."
          );
          return;
        }

        // Create user in Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // Create user profile document in Firestore
        const userDocRef = doc(
          db,
          `artifacts/${appId}/public/data/users/${user.uid}`
        );
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          username: username.trim(),
          createdAt: serverTimestamp(),
          friends: [], // Initialize empty friends list
        });

        // onAuthStateChanged will handle setting the user state
        setPage("home"); // Optimistically set page
      } catch (err) {
        console.error("Sign-up error:", err.code, err.message);
        setError(err.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-lg slide-up">
        <h1 className="text-3xl font-bold text-center text-white">
          Welcome to {APP_NAME}
        </h1>

        <form onSubmit={handleAuthAction} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            className="w-full px-4 py-3 font-semibold text-black bg-gray-200 rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
          >
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
          }}
          className="w-full text-sm text-center text-gray-400 hover:underline"
        >
          {isLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
        </button>
      </div>
    </div>
  );
}

// --- Home Page Component ---
function HomePage({ db, userId, username }) {
  const [myList, setMyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("watching");

  // --- State for modal ---
  const [selectedAnimeKitsuId, setSelectedAnimeKitsuId] = useState(null);
  const [selectedAnimeData, setSelectedAnimeData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const statusTabs = ["watching", "completed", "planned", "dropped"];

  // Listen for changes to the user's list
  useEffect(() => {
    if (!db || !userId) return;

    // Path to the user's "animeList" sub-collection
    const listCollectionPath = `artifacts/${appId}/public/data/users/${userId}/animeList`;
    const listCollectionRef = collection(db, listCollectionPath);

    setLoading(true);

    const unsubscribe = onSnapshot(
      listCollectionRef,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setMyList(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching anime list:", err);
        setError("Could not load your anime list.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, userId]); // Only re-run if db or userId changes

  // --- Fetch full anime details when a card is clicked ---
  useEffect(() => {
    if (!selectedAnimeKitsuId) return;

    const fetchAnimeDetails = async () => {
      setModalLoading(true);
      try {
        const response = await fetch(
          `${KITSU_API_URL}/anime/${selectedAnimeKitsuId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch anime details from Kitsu.");
        }
        const data = await response.json();
        setSelectedAnimeData(data.data); // Kitsu API nests result in 'data'
      } catch (err) {
        console.error("Error fetching Kitsu details:", err);
        // Can't open modal if fetch fails
        setSelectedAnimeKitsuId(null);
        setSelectedAnimeData(null);
      }
      setModalLoading(false);
    };

    fetchAnimeDetails();
  }, [selectedAnimeKitsuId]);

  const filteredList = useMemo(
    () => myList.filter((item) => item.status === statusFilter),
    [myList, statusFilter]
  );

  const handleCloseModal = () => {
    setSelectedAnimeKitsuId(null);
    setSelectedAnimeData(null);
  };

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-2xl font-semibold">My Anime List</h2>
      <p className="text-gray-400">
        Welcome back,{" "}
        <span className="font-bold text-gray-300">{username}</span>!
      </p>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 capitalize font-medium rounded-full text-sm transition-colors ${
              statusFilter === status
                ? "bg-gray-200 text-black"
                : "bg-gray-900/70 text-gray-300 hover:bg-gray-700/70 backdrop-blur-md border border-gray-700/50"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Anime List Display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading && (
          <p className="text-gray-400 col-span-full">Loading list...</p>
        )}
        {error && <p className="text-red-400 col-span-full">{error}</p>}
        {modalLoading && (
          <p className="text-gray-400 col-span-full">
            Loading anime details...
          </p>
        )}

        {!loading && !error && filteredList.length === 0 && (
          <p className="text-gray-400 col-span-full mt-4">
            Your "{statusFilter}" list is empty. Go to the "Discover" tab to
            find and add anime!
          </p>
        )}

        {!loading &&
          !error &&
          filteredList.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              // --- Add click handler ---
              onCardClick={() => setSelectedAnimeKitsuId(anime.kitsuId)}
            />
          ))}
      </div>

      {/* --- Render modal from Home Page --- */}
      {selectedAnimeData && (
        <AnimeDetailsModal
          anime={selectedAnimeData}
          onClose={handleCloseModal}
          db={db}
          userId={userId}
        />
      )}
    </div>
  );
}

// --- NEW: Discover Page Component ---
function DiscoverPage({ db, userId }) {
  const [topAiring, setTopAiring] = useState([]);
  const [topUpcoming, setTopUpcoming] = useState([]);
  const [topPopular, setTopPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State for modal ---
  const [selectedAnime, setSelectedAnime] = useState(null);

  useEffect(() => {
    // --- ROBUST FETCHING: Fetch lists independently ---
    const fetchLists = async () => {
      setLoading(true);
      setError(null);
      let hadError = false;

      // --- 1. Fetch Top Airing ---
      try {
        const airingRes = await fetch(
          `${KITSU_API_URL}/anime?filter[status]=current&sort=-user_count&page[limit]=10`
        );
        if (!airingRes.ok) throw new Error("Airing list failed");
        const airingData = await airingRes.json();
        setTopAiring(airingData.data);
      } catch (err) {
        console.error("Error fetching airing:", err);
        hadError = true;
      }

      // --- 2. Fetch Top Upcoming ---
      try {
        const upcomingRes = await fetch(
          `${KITSU_API_URL}/anime?filter[status]=upcoming&sort=-user_count&page[limit]=10`
        );
        if (!upcomingRes.ok) throw new Error("Upcoming list failed");
        const upcomingData = await upcomingRes.json();
        setTopUpcoming(upcomingData.data);
      } catch (err) {
        console.error("Error fetching upcoming:", err);
        hadError = true;
      }

      // --- 3. Fetch Top Popular ---
      try {
        const popularRes = await fetch(
          `${KITSU_API_URL}/anime?sort=-user_count&page[limit]=10`
        );
        if (!popularRes.ok) throw new Error("Popular list failed");
        const popularData = await popularRes.json();
        setTopPopular(popularData.data);
      } catch (err) {
        console.error("Error fetching popular:", err);
        hadError = true;
      }

      if (hadError) {
        setError("Could not load all discover lists. Please try again later.");
      }
      setLoading(false);
    };

    fetchLists();
  }, []);

  const handleCloseModal = () => {
    setSelectedAnime(null);
  };

  // --- Reusable Carousel Component ---
  const AnimeCarousel = ({ title, list, isLoading }) => (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="flex space-x-4 overflow-x-auto py-2">
        {isLoading ? (
          <p className="text-gray-400">Loading list...</p>
        ) : list.length === 0 ? (
          <p className="text-gray-500">Could not load this list.</p>
        ) : (
          list.map((anime) => (
            <div key={anime.id} className="w-40 flex-shrink-0">
              <AnimeCard
                anime={anime.attributes}
                onCardClick={() => setSelectedAnime(anime)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-6">
      <h2 className="text-2xl font-semibold">Discover Anime</h2>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}

      <AnimeCarousel title="Top Airing" list={topAiring} isLoading={loading} />
      <AnimeCarousel
        title="Most Popular All Time"
        list={topPopular}
        isLoading={loading}
      />
      <AnimeCarousel
        title="Top Upcoming"
        list={topUpcoming}
        isLoading={loading}
      />

      {/* --- Render modal --- */}
      {selectedAnime && (
        <AnimeDetailsModal
          anime={selectedAnime}
          onClose={handleCloseModal}
          db={db}
          userId={userId}
        />
      )}
    </div>
  );
}

// --- Profile Page Component ---
function ProfilePage({ db, userId, currentUser, username, setUsername }) {
  const [newUsername, setNewUsername] = useState(username);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // --- Import State ---
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${userId}`);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (newUsername.trim() === username) {
      setMessage("This is already your username.");
      return;
    }
    if (newUsername.trim().length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Check if new username is already taken
      const usersRef = collection(db, `artifacts/${appId}/public/data/users`);
      const q = query(
        usersRef,
        where("username", "==", newUsername.trim()),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setMessage(
          "This username is already taken. Please choose another one."
        );
        setLoading(false);
        return;
      }

      // Update the username
      await updateDoc(userDocRef, {
        username: newUsername.trim(),
      });

      setUsername(newUsername.trim()); // Update app-wide state
      setMessage("Username updated successfully!");
    } catch (error) {
      console.error("Error updating username:", error);
      setMessage("Failed to update username. Please try again.");
    }
    setLoading(false);
  };

  // --- MAL Status Mapper ---
  const mapMalStatus = (malStatus) => {
    // MAL Statuses from XML: "Watching", "Completed", "On-Hold", "Dropped", "Plan to Watch"
    switch (malStatus) {
      case "Watching":
        return "watching";
      case "Completed":
        return "completed";
      case "On-Hold":
        return "planned"; // Map On-Hold to Planned
      case "Dropped":
        return "dropped";
      case "Plan to Watch":
        return "planned";
      default:
        return null; // Ignore other statuses
    }
  };

  // --- MAL Import Handler ---
  const handleMalImport = async () => {
    if (!importFile) {
      setImportMessage("Please select your MAL export file first.");
      return;
    }

    setImportLoading(true);
    setImportMessage("Starting import... This may take several minutes.");

    try {
      const fileText = await importFile.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(fileText, "text/xml");
      const animeNodes = xmlDoc.getElementsByTagName("anime");
      const totalAnime = animeNodes.length;

      setImportMessage(`Found ${totalAnime} anime. Beginning import...`);

      // Use a batch for faster writes
      let batch = writeBatch(db); // Correct: initialize batch here
      const listCollectionRef = collection(
        db,
        `artifacts/${appId}/public/data/users/${userId}/animeList`
      );
      let importedCount = 0;
      let notFoundCount = 0;

      for (let i = 0; i < animeNodes.length; i++) {
        const node = animeNodes[i];
        const title = node.getElementsByTagName("series_title")[0].textContent;
        // This is the fix: read my_status *text* content
        const malStatus = node.getElementsByTagName("my_status")[0].textContent;

        // --- Import score and progress ---
        const malScore = parseInt(
          node.getElementsByTagName("my_score")[0].textContent,
          10
        );
        const malWatchedEpisodes = parseInt(
          node.getElementsByTagName("my_watched_episodes")[0].textContent,
          10
        );

        const appStatus = mapMalStatus(malStatus);

        if (!appStatus) {
          // Skip anime with statuses we don't track (e.g., "N/A")
          continue;
        }

        // 1. Search Kitsu API for the title
        setImportMessage(
          `(${i + 1}/${totalAnime}) Searching for "${title}"...`
        );
        let kitsuResult = null;
        try {
          const encodedQuery = encodeURIComponent(title);
          const res = await fetch(
            `${KITSU_API_URL}/anime?filter[text]=${encodedQuery}&page[limit]=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              kitsuResult = data.data[0];
            }
          }
        } catch (apiError) {
          console.warn(`API search failed for "${title}":`, apiError);
          // Don't stop the whole import, just skip this one
        }

        if (kitsuResult) {
          // 2. We found a match, add it to the batch
          const attr = kitsuResult.attributes;
          const animeData = {
            kitsuId: kitsuResult.id.toString(),
            title: attr.canonicalTitle,
            imageUrl: attr.posterImage?.small || null,
            status: appStatus,
            // --- Add score and progress ---
            score: malScore > 0 ? malScore : 0, // 0 for 'No Score'
            watchedEpisodes: malWatchedEpisodes || 0,
            totalEpisodes: attr.episodeCount || 0, // Store total for progress bar
          };

          const docRef = doc(listCollectionRef, animeData.kitsuId);
          batch.set(docRef, animeData);
          importedCount++;
        } else {
          // 3. No match found
          setImportMessage(
            `(${i + 1}/${totalAnime}) Could not find "${title}". Skipping.`
          );
          notFoundCount++;
        }

        // To avoid overwhelming Firestore, commit the batch every 100 items
        if (i > 0 && i % 100 === 0) {
          await batch.commit();
          // We need a new batch after committing
          batch = writeBatch(db);
          setImportMessage(`Imported ${importedCount} anime so far...`);
        }

        // Add a small delay to be nice to Kitsu's API
        await new Promise((res) => setTimeout(res, 250)); // 1/4 second delay
      }

      // Commit any remaining items in the batch
      await batch.commit();

      setImportLoading(false);
      setImportMessage(
        `Import Complete! Imported: ${importedCount}. Not Found: ${notFoundCount}.`
      );
      setImportFile(null);
    } catch (err) {
      console.error("Import failed:", err);
      setImportLoading(false);
      setImportMessage(
        `Error during import: ${err.message}. Please try again.`
      );
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-lg slide-up">
      <h2 className="text-2xl font-semibold mb-6 text-white">My Profile</h2>

      <div className="space-y-4 mb-6">
        <p className="text-gray-400">
          <span className="font-medium text-gray-300">Email:</span>{" "}
          {currentUser.email}
        </p>
        <p className="text-gray-400">
          <span className="font-medium text-gray-300">User ID:</span>
          <span className="text-xs break-all ml-2 p-1 bg-gray-800 rounded font-mono">
            {userId}
          </span>
        </p>
      </div>

      <form onSubmit={handleUpdateUsername} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Public Username
          </label>
          <input
            id="username"
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            This is the name your friends will see and use to find you.
          </p>
        </div>

        {message && (
          <p
            className={`text-sm text-center ${
              message.startsWith("Failed") ? "text-red-400" : "text-green-400"
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || newUsername.trim() === username}
          className="w-full px-4 py-3 font-semibold text-black bg-gray-200 rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {loading ? "Updating..." : "Update Username"}
        </button>
      </form>

      {/* --- MAL Import Section --- */}
      <div className="mt-8 pt-6 border-t border-gray-700/50">
        <h3 className="text-xl font-semibold mb-4 text-white">
          Import from MyAnimeList
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Go to your MAL profile, find the "Export" link on the side, and upload
          the generated `.xml` file here.
        </p>
        <div className="space-y-4">
          <input
            type="file"
            accept=".xml"
            onChange={(e) => setImportFile(e.target.files[0])}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-gray-700 file:text-white
              hover:file:bg-gray-600"
          />
          <button
            onClick={handleMalImport}
            disabled={importLoading || !importFile}
            className="w-full px-4 py-3 font-semibold text-black bg-gray-200 rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {importLoading ? "Importing..." : "Start Import"}
          </button>
          {importMessage && (
            <p
              className={`text-sm text-center ${
                importMessage.startsWith("Error")
                  ? "text-red-400"
                  : "text-green-400"
              }`}
            >
              {importMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Search Page Component ---
function SearchPage({ db, userId }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnime, setSelectedAnime] = useState(null);

  // --- Debounced Search Effect ---
  useEffect(() => {
    // Set up a timer
    const timer = setTimeout(() => {
      // Only search if query is long enough
      if (query.trim().length < 3) {
        setResults([]);
        if (query.trim().length > 0) {
          setError("Please enter at least 3 characters.");
        } else {
          setError(""); // Clear error if input is empty
        }
        return;
      }

      const handleSearch = async () => {
        setLoading(true);
        setError("");
        setResults([]);

        try {
          // Use encodeURIComponent to safely format the query
          const encodedQuery = encodeURIComponent(query);
          const response = await fetch(
            `${KITSU_API_URL}/anime?filter[text]=${encodedQuery}&page[limit]=20`
          );

          if (!response.ok) {
            throw new Error(`Kitsu API error: ${response.statusText}`);
          }

          const data = await response.json();

          if (data.data.length === 0) {
            setError("No results found. Try a different search term.");
          } else {
            setResults(data.data);
          }
        } catch (err) {
          console.error("Search error:", err);
          setError("Failed to fetch anime. Please check your connection.");
        }
        setLoading(false);
      };

      handleSearch();
    }, 500); // 500ms (0.5 second) delay

    // Clean up the timer if query changes or component unmounts
    return () => clearTimeout(timer);
  }, [query]); // This effect re-runs every time 'query' changes

  return (
    <div className="flex flex-col space-y-4">
      {/* Search Input - No form or button needed */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an anime..."
          className="w-full px-4 py-3 pl-10 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon />
        </div>
      </div>

      {error && <p className="text-red-400 text-center">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading && (
          <p className="text-gray-400 col-span-full">Loading results...</p>
        )}

        {!loading &&
          results.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime.attributes} // Pass attributes object
              onCardClick={() => setSelectedAnime(anime)}
            />
          ))}
      </div>

      {selectedAnime && (
        <AnimeDetailsModal
          anime={selectedAnime}
          onClose={() => setSelectedAnime(null)}
          db={db}
          userId={userId}
        />
      )}
    </div>
  );
}

// --- Friends Page Component ---
function FriendsPage({ db, userId, username }) {
  const [myFriends, setMyFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");

  const [viewingFriend, setViewingFriend] = useState(null);
  const [friendList, setFriendList] = useState([]);
  const [loadingFriendList, setLoadingFriendList] = useState(false);

  // --- State for modal on home page ---
  const [selectedAnimeKitsuId, setSelectedAnimeKitsuId] = useState(null);
  const [selectedAnimeData, setSelectedAnimeData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const userDocRef = doc(db, `artifacts/${appId}/public/data/users/${userId}`);
  const usersCollectionRef = collection(
    db,
    `artifacts/${appId}/public/data/users`
  );

  // --- Fetch My Friends List ---
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const friends = docSnap.data().friends || [];
          setMyFriends(friends);
          setError(""); // Clear error if doc is found
        } else {
          setError("Could not find your user profile.");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching friends list:", err);
        setError("Failed to load friends list.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, userId]); // Rerun if db or userId changes

  // --- Fetch full anime details when a friend's anime card is clicked ---
  useEffect(() => {
    if (!selectedAnimeKitsuId) return;

    const fetchAnimeDetails = async () => {
      setModalLoading(true);
      try {
        const response = await fetch(
          `${KITSU_API_URL}/anime/${selectedAnimeKitsuId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch anime details from Kitsu.");
        }
        const data = await response.json();
        setSelectedAnimeData(data.data); // Kitsu API nests result in 'data'
      } catch (err) {
        console.error("Error fetching Kitsu details:", err);
        // Can't open modal if fetch fails
        setSelectedAnimeKitsuId(null);
        setSelectedAnimeData(null);
      }
      setModalLoading(false);
    };

    fetchAnimeDetails();
  }, [selectedAnimeKitsuId]);

  const handleCloseModal = () => {
    setSelectedAnimeKitsuId(null);
    setSelectedAnimeData(null);
  };

  // --- Search for Friends ---
  const handleFriendSearch = async (e) => {
    e.preventDefault();
    if (friendSearch.trim().length < 3) {
      setSearchError("Please enter at least 3 characters.");
      setSearchResults([]);
      return;
    }
    if (friendSearch.trim().toLowerCase() === username.toLowerCase()) {
      setSearchError("You can't search for yourself.");
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setSearchResults([]);

    try {
      // Query for username. Note: Firestore search is case-sensitive.
      // For a real app, you'd use a lowercase field or a 3rd party search service.
      const q = query(
        usersCollectionRef,
        where("username", "==", friendSearch.trim()),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map((doc) => doc.data());

      // Filter out self and already added friends
      const filteredUsers = users.filter(
        (user) =>
          user.uid !== userId &&
          !myFriends.find((friend) => friend.uid === user.uid)
      );

      if (filteredUsers.length === 0) {
        setSearchError("No users found or user is already your friend.");
      } else {
        setSearchResults(filteredUsers);
      }
    } catch (err) {
      console.error("Friend search error:", err);
      setSearchError("Failed to search for users.");
    }
    setSearchLoading(false);
  };

  // --- Add a Friend ---
  const addFriend = async (friendUser) => {
    const newFriend = {
      uid: friendUser.uid,
      username: friendUser.username,
    };

    // Add to my friends list
    const newFriendsList = [...myFriends, newFriend];
    try {
      await updateDoc(userDocRef, {
        friends: newFriendsList,
      });
      // Remove from search results
      setSearchResults((prev) =>
        prev.filter((user) => user.uid !== friendUser.uid)
      );
    } catch (err) {
      console.error("Error adding friend:", err);
      setSearchError("Failed to add friend.");
    }
  };

  // --- View Friend's List ---
  const viewFriendList = (friend) => {
    setViewingFriend(friend);
    setLoadingFriendList(true);
    setFriendList([]);

    // Path to the friend's "animeList" sub-collection
    const friendListPath = `artifacts/${appId}/public/data/users/${friend.uid}/animeList`;
    const listCollectionRef = collection(db, friendListPath);

    // Using getDocs for a one-time fetch, as we don't need real-time updates
    getDocs(listCollectionRef)
      .then((snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setFriendList(list);
        setLoadingFriendList(false);
      })
      .catch((err) => {
        console.error("Error fetching friend's list:", err);
        setLoadingFriendList(false);
      });
  };

  // --- Render Friend's List Modal ---
  if (viewingFriend) {
    return (
      <div className="fixed inset-0 z-20 bg-black bg-opacity-75 flex items-center justify-center p-4 fade-in">
        <div className="relative w-full max-w-3xl max-h-[80vh] bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-xl p-6 slide-up">
          <button
            onClick={() => setViewingFriend(null)}
            className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white"
          >
            <CloseIcon />
          </button>
          <h3 className="text-xl font-semibold mb-4">
            {viewingFriend.username}'s List
          </h3>

          {loadingFriendList ? (
            <p>Loading {viewingFriend.username}'s list...</p>
          ) : (
            <div className="overflow-y-auto max-h-[65vh]">
              {friendList.length === 0 ? (
                <p>{viewingFriend.username} hasn't added any anime yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {friendList.map((anime) => (
                    // --- Pass 'isFriendList' to hide score/progress on friend's card ---
                    <AnimeCard
                      key={anime.id}
                      anime={anime}
                      isFriendList={true}
                      // --- Allow clicking on friend's anime ---
                      onCardClick={() => setSelectedAnimeKitsuId(anime.kitsuId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- Modal for viewing friend's anime details --- */}
          {modalLoading && (
            <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-md flex items-center justify-center">
              <p className="text-white">Loading anime details...</p>
            </div>
          )}
          {selectedAnimeData && (
            <AnimeDetailsModal
              anime={selectedAnimeData}
              onClose={handleCloseModal}
              db={db}
              userId={userId} // Pass *your* userId so you can add it to *your* list
            />
          )}
        </div>
      </div>
    );
  }

  // --- Render Main Friends Page ---
  return (
    <div className="flex flex-col space-y-6">
      {/* Search for new friends */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">Find Friends</h2>
        <form onSubmit={handleFriendSearch} className="flex space-x-2">
          <input
            type="text"
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
            placeholder="Search by exact username..."
            className="flex-grow px-4 py-3 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="flex-shrink-0 px-4 py-3 font-semibold text-black bg-gray-200 rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:bg-gray-600"
          >
            <SearchIcon />
          </button>
        </form>
        {searchError && (
          <p className="text-red-400 text-sm mt-2">{searchError}</p>
        )}
        {searchLoading && (
          <p className="text-gray-400 text-sm mt-2">Searching...</p>
        )}

        {/* Search Results */}
        <div className="mt-4 space-y-2">
          {searchResults.map((user) => (
            <UserCard key={user.uid} user={user} onAdd={addFriend} />
          ))}
        </div>
      </div>

      {/* My Friends List */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">My Friends</h2>
        {loading && <p className="text-gray-400">Loading friends list...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && (
          <div className="space-y-3">
            {myFriends.length === 0 ? (
              <p className="text-gray-400">
                You haven't added any friends yet. Use the search above!
              </p>
            ) : (
              myFriends.map((friend) => (
                <div
                  key={friend.uid}
                  className="flex items-center justify-between p-4 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg"
                >
                  <span className="font-medium text-white">
                    {friend.username}
                  </span>
                  <button
                    onClick={() => viewFriendList(friend)}
                    className="px-3 py-1 text-sm font-medium text-black bg-gray-200 rounded-md hover:bg-white transition-colors"
                  >
                    View List
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Reusable Components ---

function UserCard({ user, onAdd }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow">
      <span className="font-medium text-white">{user.username}</span>
      <button
        onClick={() => onAdd(user)}
        className="flex items-center justify-center p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
        title={`Add ${user.username} as a friend`}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

// --- 3D Tilt Card Component ---
function AnimeCard({ anime, onCardClick, isFriendList = false }) {
  // Check if anime data is from Kitsu (search) or Firestore (list)
  const isKitsu = !!anime.canonicalTitle;

  const title = isKitsu ? anime.canonicalTitle : anime.title;
  const imageUrl = isKitsu ? anime.posterImage?.small : anime.imageUrl;

  // --- Get score and progress ---
  const score = anime.score || 0;
  const watched = anime.watchedEpisodes || 0;
  const total = anime.totalEpisodes || 0;

  let progressPercent = 0;
  if (total > 0 && watched > 0) {
    progressPercent = (watched / total) * 100;
  }
  // If show is completed, force progress to 100%
  if (anime.status === "completed" && total > 0) {
    progressPercent = 100;
  }

  // Fallback image
  const placeholderImg = `https://placehold.co/500x700/1F2937/E5E7EB?text=${encodeURIComponent(
    title
  )}`;

  // --- 3D Tilt & Light Effect ---
  const cardRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const { left, top, width, height } =
      cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    // Calculate rotation
    const rotateX = ((y - height / 2) / (height / 2)) * -5; // Max 5deg tilt
    const rotateY = ((x - width / 2) / (width / 2)) * 5; // Max 5deg tilt

    // Calculate light position
    const lightX = (x / width) * 100;
    const lightY = (y / height) * 100;

    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    cardRef.current.style.setProperty("--light-x", `${lightX}%`);
    cardRef.current.style.setProperty("--light-y", `${lightY}%`);
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  };

  return (
    <div
      ref={cardRef}
      className={`anime-card relative bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-lg overflow-hidden flex flex-col
        ${onCardClick ? "cursor-pointer" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onCardClick}
    >
      {/* --- Score Badge --- */}
      {!isKitsu && !isFriendList && score > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-gray-200 text-black text-xs font-bold px-2 py-1 rounded-full shadow-md">
          {score}/10
        </div>
      )}

      <img
        src={imageUrl || placeholderImg}
        alt={title}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = placeholderImg;
        }}
        className="w-full h-48 sm:h-64 object-cover pointer-events-none"
      />
      <div className="p-3 flex-grow pointer-events-none">
        <h3 className="font-semibold text-sm text-white truncate" title={title}>
          {title}
        </h3>
      </div>

      {/* --- Progress Bar --- */}
      {!isKitsu && !isFriendList && progressPercent > 0 && (
        <div className="w-full bg-gray-700/50 h-1 pointer-events-none">
          <div
            className="bg-green-500 h-1"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      )}

      {/* --- Light Effect --- */}
      <div
        className="anime-card-light absolute inset-0"
        style={{
          "--light-x": "50%",
          "--light-y": "50%",
        }}
      ></div>
    </div>
  );
}

function AnimeDetailsModal({ anime, onClose, db, userId }) {
  const [loading, setLoading] = useState(true);
  // --- Store list item in state ---
  const [listItem, setListItem] = useState(null);

  // Kitsu API data is nested in 'attributes'
  const attr = anime.attributes;

  const title = attr.canonicalTitle;
  const imageUrl =
    attr.posterImage?.medium ||
    `https://placehold.co/500x700/1F2937/E5E7EB?text=${encodeURIComponent(
      title
    )}`;
  // --- Get total episodes from Kitsu ---
  const totalEpisodes = attr.episodeCount || 0; // 0 if unknown

  // Find anime ID in my list (Kitsu ID is a string, so we compare strings)
  const animeKitsuId = anime.id.toString();

  // Memoize the doc reference
  const animeDocRef = useMemo(() => {
    if (!db || !userId) return null;
    const listCollectionPath = `artifacts/${appId}/public/data/users/${userId}/animeList`;
    return doc(collection(db, listCollectionPath), animeKitsuId);
  }, [db, userId, animeKitsuId]);

  // --- Use onSnapshot to get real-time data ---
  useEffect(() => {
    if (!animeDocRef) return;

    setLoading(true);
    const unsubscribe = onSnapshot(
      animeDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setListItem(docSnap.data());
        } else {
          setListItem(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching list item:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [animeDocRef]);

  // Custom hook version that skips initial render
  const useDebouncedSaveAfterMount = (value, saveFunction) => {
    const isMounted = React.useRef(false);

    useEffect(() => {
      if (isMounted.current) {
        const handler = setTimeout(() => {
          saveFunction(value);
        }, 1000); // 1-second delay

        return () => clearTimeout(handler);
      } else {
        isMounted.current = true;
      }
    }, [value, saveFunction]);
  };

  // --- Local state for inputs ---
  const [localScore, setLocalScore] = useState(listItem?.score || 0);
  const [localEpisodes, setLocalEpisodes] = useState(
    listItem?.watchedEpisodes || 0
  );

  // Update local state if the Firestore data changes (e.g., on load)
  useEffect(() => {
    setLocalScore(listItem?.score || 0);
    setLocalEpisodes(listItem?.watchedEpisodes || 0);
  }, [listItem]);

  // --- Save functions for debouncing ---
  const saveScore = useCallback(
    (newScore) => {
      if (!animeDocRef || newScore === listItem?.score) return;
      updateDoc(animeDocRef, { score: newScore }).catch((err) =>
        console.error("Failed to save score:", err)
      );
    },
    [animeDocRef, listItem?.score]
  );

  const saveProgress = useCallback(
    (newProgress) => {
      if (
        !animeDocRef ||
        newProgress === listItem?.watchedEpisodes ||
        newProgress === "" // Don't save if input is empty
      )
        return;
      updateDoc(animeDocRef, { watchedEpisodes: Number(newProgress) }).catch(
        (err) => console.error("Failed to save progress:", err)
      );
    },
    [animeDocRef, listItem?.watchedEpisodes]
  );

  // Apply debouncing
  useDebouncedSaveAfterMount(localScore, saveScore);
  useDebouncedSaveAfterMount(localEpisodes, saveProgress);

  // --- Add/Update/Remove from List ---
  const addToList = async (status) => {
    const animeData = {
      kitsuId: animeKitsuId,
      title: title,
      imageUrl: attr.posterImage?.small || null,
      status: status,
      score: listItem?.score || 0, // Keep existing score
      watchedEpisodes: listItem?.watchedEpisodes || 0, // Keep existing progress
      totalEpisodes: totalEpisodes, // Add total episodes
    };

    try {
      // Use setDoc to create or overwrite
      await setDoc(animeDocRef, animeData, { merge: true });
      // onSnapshot will handle the local state update
    } catch (err) {
      console.error("Error adding to list:", err);
    }
  };

  const removeFromList = async () => {
    if (!listItem) return;
    try {
      await deleteDoc(animeDocRef);
      // onSnapshot will set listItem to null
    } catch (err) {
      console.error("Error removing from list:", err);
    }
  };

  const statusOptions = ["watching", "completed", "planned", "dropped"];

  // --- Helper function to format start date ---
  const getYear = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).getFullYear();
  };

  return (
    <div
      className="fixed inset-0 z-20 bg-black bg-opacity-75 flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-xl overflow-y-auto slide-up"
        onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:bg-gray-700/50 hover:text-white z-10"
        >
          <CloseIcon />
        </button>

        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 md:h-64 object-cover object-top"
        />

        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>

          {/* --- Info Tags --- */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-700/70 text-gray-200 text-xs font-medium rounded-full">
              {attr.status === "current"
                ? "Airing"
                : attr.status.charAt(0).toUpperCase() + attr.status.slice(1)}
            </span>
            {getYear(attr.startDate) && (
              <span className="px-3 py-1 bg-gray-700/70 text-gray-200 text-xs font-medium rounded-full">
                {getYear(attr.startDate)}
              </span>
            )}
            {attr.ageRating && (
              <span className="px-3 py-1 bg-gray-700/70 text-gray-200 text-xs font-medium rounded-full">
                {attr.ageRating}
              </span>
            )}
            {/* --- Trailer Button --- */}
            {attr.youtubeVideoId && (
              <a
                href={`https://www.youtube.com/watch?v=${attr.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-1 bg-red-600/70 text-white text-xs font-medium rounded-full hover:bg-red-500/70"
              >
                <PlayIcon />
                Watch Trailer
              </a>
            )}
          </div>

          <p className="text-sm text-gray-300 max-h-32 overflow-y-auto">
            {attr.synopsis || "No synopsis available."}
          </p>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => addToList(status)}
                disabled={loading}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  listItem?.status === status
                    ? "bg-gray-200 text-black"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                } disabled:opacity-50`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* --- Score and Progress Section --- */}
          {listItem && !loading && (
            <div className="pt-4 border-t border-gray-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="score"
                  className="text-sm font-medium text-gray-300"
                >
                  Your Score
                </label>
                <select
                  id="score"
                  value={localScore}
                  onChange={(e) => setLocalScore(parseInt(e.target.value, 10))}
                  className="px-3 py-2 bg-gray-800/70 border border-gray-700 rounded-lg text-white"
                >
                  <option value="0">N/A</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label
                  htmlFor="progress"
                  className="text-sm font-medium text-gray-300"
                >
                  Episode Progress
                </label>
                <div className="flex items-center space-x-2 text-white">
                  <input
                    id="progress"
                    type="number"
                    value={localEpisodes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setLocalEpisodes(""); // Allow empty input
                      } else {
                        const num = parseInt(val, 10);
                        if (num >= 0) {
                          setLocalEpisodes(num);
                        }
                      }
                    }}
                    className="w-20 px-3 py-2 bg-gray-800/70 border border-gray-700 rounded-lg text-white text-right"
                    min="0"
                    max={totalEpisodes > 0 ? totalEpisodes : undefined}
                  />
                  {totalEpisodes > 0 && (
                    <span className="text-gray-400">/ {totalEpisodes}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {listItem && (
            <button
              onClick={removeFromList}
              disabled={loading}
              className="w-full px-4 py-2 font-semibold text-white bg-red-600/70 rounded-lg hover:bg-red-500/70 transition-colors disabled:opacity-50"
            >
              Remove from List
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
