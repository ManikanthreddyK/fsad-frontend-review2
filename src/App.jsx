import { useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "./api";

const getApiErrorMessage = (error, fallbackMessage) => error?.response?.data?.message || fallbackMessage;

const AUTH_USER_KEY = "authUser";
const AUTH_TOKEN_KEY = "token";
const authHighlights = [
  {
    icon: "🎯",
    title: "Discover Your Direction",
    description: "Every student deserves the right guidance to choose a confident career path."
  },
  {
    icon: "🤝",
    title: "Learn With Mentors",
    description: "Great mentorship turns confusion into clarity and dreams into action."
  },
  {
    icon: "🚀",
    title: "Build Your Future",
    description: "Career Advice & Mentorship Platform helps students move step by step toward success."
  }
];

const readStoredUser = () => {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

const sanitizeValue = (value) => (value ?? "").toString().trim();

const buildRegisterPayload = (form, role) => {
  const basePayload = {
    fullName: sanitizeValue(form.fullName),
    email: sanitizeValue(form.email),
    password: form.password
  };

  if (role === "counsellor") {
    return {
      ...basePayload,
      expertise: sanitizeValue(form.expertise),
      careerPath: sanitizeValue(form.careerPath)
    };
  }

  return {
    ...basePayload,
    interests: sanitizeValue(form.interests),
    skills: sanitizeValue(form.skills)
  };
};

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const DashboardStat = ({ label, value, accent = "blue" }) => (
  <div className={`dashboard-stat ${accent}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const SectionCard = ({ title, subtitle, action, children, className = "" }) => (
  <section className={`dashboard-card ${className}`.trim()}>
    <div className="section-header">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const QuickAction = ({ title, description }) => (
  <div className="quick-action">
    <strong>{title}</strong>
    <span>{description}</span>
  </div>
);

const ResourceRow = ({ resource }) => (
  <div className="list-item">
    <div>
      <strong>{resource.title}</strong>
      <p>{resource.careerPath}</p>
      {resource.description && <span>{resource.description}</span>}
    </div>
    {resource.link && (
      <a href={resource.link} target="_blank" rel="noreferrer" className="link-button">
        Open
      </a>
    )}
  </div>
);

function App() {
  const [tab, setTab] = useState("student");
  const [authMode, setAuthMode] = useState("login");
  const [registerRole, setRegisterRole] = useState("student");
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    interests: "",
    skills: "",
    expertise: "",
    careerPath: ""
  });
  const [resources, setResources] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [mode, setMode] = useState("ONLINE");
  const [studentSessions, setStudentSessions] = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [adminStudents, setAdminStudents] = useState([]);
  const [adminCounsellors, setAdminCounsellors] = useState([]);
  const [counsellorSessions, setCounsellorSessions] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [newResource, setNewResource] = useState({
    title: "",
    careerPath: "",
    description: "",
    link: ""
  });

  const recommendedCounsellors = counsellors.slice(0, 3);
  const recommendedResources = resources.slice(0, 4);
  const upcomingStudentSessions = studentSessions.slice(0, 3);
  const todaysAppointments = counsellorSessions.slice(0, 3);
  const counsellorAssignedStudents = useMemo(
    () =>
      Array.from(
        new Map(counsellorSessions.map((session) => [session.student.id, session.student])).values()
      ),
    [counsellorSessions]
  );

  const fetchBase = async (authUser = currentUser) => {
    try {
      setErrorMessage("");
      const [res1, res2, res3] = await Promise.all([
        api.get("/public/resources"),
        api.get("/public/counsellors"),
        api.get("/user/students")
      ]);
      setResources(res1.data);
      setCounsellors(res2.data);
      setStudents(res3.data);
      if (authUser?.role === "STUDENT") {
        setSelectedStudent(authUser.id);
      } else if (res3.data.length > 0) {
        setSelectedStudent(res3.data[0].id);
      }
      if (res2.data.length > 0) {
        setSelectedCounsellor(res2.data[0].id);
      }
      if (authUser?.role === "ADMIN") {
        await loadAdminPeople();
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Could not load data from backend. Confirm backend is running on http://localhost:8080 and refresh."));
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchBase(currentUser);
    }
  }, []);

  const loadStudentSessions = async () => {
    if (!selectedStudent) return;
    const res = await api.get(`/user/sessions/${selectedStudent}`);
    setStudentSessions(res.data);
  };

  useEffect(() => {
    if (currentUser && currentUser.role === "STUDENT") {
      loadStudentSessions();
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (currentUser?.role === "STUDENT") {
      setTab("student");
    } else if (currentUser?.role === "ADMIN") {
      setTab("admin");
    } else if (currentUser?.role === "COUNSELLOR") {
      setTab("counsellor");
    }
  }, [currentUser]);

  const bookSession = async (e) => {
    e.preventDefault();
    try {
      setErrorMessage("");
      await api.post("/user/sessions", {
        studentId: Number(selectedStudent),
        counsellorId: Number(selectedCounsellor),
        sessionTime: new Date(sessionTime).toISOString().slice(0, 19),
        mode
      });
      await loadStudentSessions();
      alert("Session booked successfully.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Session booking failed. Check form values and backend connection."));
    }
  };

  const loadEngagement = async () => {
    const res = await api.get("/admin/engagement");
    setEngagement(res.data);
  };

  const loadAdminPeople = async () => {
    const [studentsRes, counsellorsRes] = await Promise.all([
      api.get("/admin/students"),
      api.get("/admin/counsellors")
    ]);
    setAdminStudents(studentsRes.data);
    setAdminCounsellors(counsellorsRes.data);
  };

  const loadCounsellorSessions = async (counsellorId = currentUser?.id) => {
    if (!counsellorId) return;
    const res = await api.get(`/counsellor/sessions/${counsellorId}`);
    setCounsellorSessions(res.data);
  };

  const addResource = async (e) => {
    e.preventDefault();
    await api.post("/admin/resources", newResource);
    setNewResource({ title: "", careerPath: "", description: "", link: "" });
    const res = await api.get("/admin/resources");
    setResources(res.data);
  };

  const deleteStudent = async (id) => {
    await api.delete(`/admin/students/${id}`);
    await loadAdminPeople();
    await loadEngagement();
  };

  const deleteCounsellor = async (id) => {
    await api.delete(`/admin/counsellors/${id}`);
    await loadAdminPeople();
    await loadEngagement();
  };

  const persistAuth = (authResponse) => {
    const { token, ...user } = authResponse;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      setAuthToken(token);
    }
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const loginPayload = {
  email: authForm.email,
  password: authForm.password
};
    console.log("Login clicked", loginPayload);
    try {
      setErrorMessage("");
      console.log("POST /api/auth/login", loginPayload);
      const res = await api.post("/auth/login", loginPayload);
      const authUser = persistAuth(res.data);
      if (authUser.role === "STUDENT") {
        setSelectedStudent(authUser.id);
      } else if (authUser.role === "COUNSELLOR") {
        await loadCounsellorSessions(authUser.id);
      }
      await fetchBase(authUser);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Login failed. Check your email and password."));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (authForm.password !== authForm.confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    const registerPayload = buildRegisterPayload(authForm, registerRole);
    const registerEndpoint = `/auth/register/${registerRole}`;
    console.log("Register clicked", registerPayload);
    try {
      setErrorMessage("");
      console.log(`POST /api${registerEndpoint}`, registerPayload);
      await api.post(registerEndpoint, registerPayload);
      setAuthMode("login");
      setAuthForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        interests: "",
        skills: "",
        expertise: "",
        careerPath: ""
      });
      alert("Registration successful. Please login.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Registration failed. Check your values and try again."));
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setResources([]);
    setCounsellors([]);
    setStudents([]);
    setStudentSessions([]);
    setAdminStudents([]);
    setAdminCounsellors([]);
    setCounsellorSessions([]);
    setErrorMessage("");
  };

  if (!currentUser) {
    return (
      <div className="auth-page">
        <header className="auth-navbar">
          <div className="brand-mark">CA</div>
          <div>
            <h1>Career Advice & Mentorship Platform</h1>
            <p>Modern guidance for students, mentors, and counsellors.</p>
          </div>
        </header>

        <main className="auth-shell">
          <section className="auth-hero">
            <span className="eyebrow">Career Growth Starts Here</span>
            <h2>Career Advice & Mentorship Platform</h2>
            <p className="hero-copy">
              Personalized career guidance, mentorship, and counseling for students to build a better future.
            </p>
            <div className="feature-stack">
              {authHighlights.map((feature) => (
                <div key={feature.title} className="feature-point">
                  <span>{feature.icon}</span>
                  <div>
                    <strong>{feature.title}</strong>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-trust">
              <strong>✨ Guiding students today for better careers tomorrow.</strong>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-card-top">
              <span className="eyebrow">Secure Access</span>
              <h3>{authMode === "login" ? "Welcome back" : "Create your account"}</h3>
              <p>
                {authMode === "login"
                  ? "Sign in to manage counselling, mentorship, and your personalized dashboard."
                  : "Register as a student, admin, or counsellor to start using the platform."}
              </p>
            </div>

            {errorMessage && <p className="error">{errorMessage}</p>}

            <div className="auth-switch">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>
                Login
              </button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>
                Register
              </button>
            </div>

            {authMode === "login" ? (
              <>
                <form onSubmit={handleLogin} className="form">
                  <div className="field-group">
                    <label>Email address</label>
                    <input
                      placeholder="name@example.com"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label>Password</label>
                    <input
                      placeholder="Enter your password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field-group">
      
                  </div>
                  <button type="submit" className="primary-button">Sign In</button>
                </form>

                <p className="hint">Demo logins: `student1@example.com` / `student123`, `admin@example.com` / `admin123`</p>
              </>
            ) : (
              <form onSubmit={handleRegister} className="form">
                <div className="field-group">
                  <label>Account type</label>
                  <select value={registerRole} onChange={(e) => setRegisterRole(e.target.value)}>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="counsellor">Counsellor</option>
                  </select>
                </div>

                <div className="form-grid">
                  <div className="field-group">
                    <label>Full name</label>
                    <input
                      placeholder="Enter full name"
                      value={authForm.fullName}
                      onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label>Email</label>
                    <input
                      placeholder="name@example.com"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>Password</label>
                  <input
                    placeholder="Create a password"
                    type="password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Confirm Password</label>
                  <input
                    placeholder="Confirm your password"
                    type="password"
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                {registerRole !== "counsellor" && (
                  <div className="form-grid">
                    <div className="field-group">
                      <label>Interests</label>
                      <input
                        placeholder="Technology, Design, Finance..."
                        value={authForm.interests}
                        onChange={(e) => setAuthForm({ ...authForm, interests: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <label>Skills</label>
                      <input
                        placeholder="Communication, Java, Analysis..."
                        value={authForm.skills}
                        onChange={(e) => setAuthForm({ ...authForm, skills: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {registerRole === "counsellor" && (
                  <div className="form-grid">
                    <div className="field-group">
                      <label>Expertise</label>
                      <input
                        placeholder="Software Engineering, Finance..."
                        value={authForm.expertise}
                        onChange={(e) => setAuthForm({ ...authForm, expertise: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <label>Career path</label>
                      <input
                        placeholder="Data Science, Consulting..."
                        value={authForm.careerPath}
                        onChange={(e) => setAuthForm({ ...authForm, careerPath: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="primary-button">Create Account</button>
              </form>
            )}
          </section>
        </main>
      </div>
    );
  }

  const pageTitle =
    currentUser.role === "STUDENT"
      ? "Student Dashboard"
      : currentUser.role === "ADMIN"
        ? "Admin Dashboard"
        : "Counsellor Dashboard";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">CA</div>
          <div>
            <strong>Career Advice</strong>
            <span>Mentorship Platform</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {currentUser.role === "STUDENT" && (
            <button className={tab === "student" ? "active" : ""} onClick={() => setTab("student")}>
              Student Dashboard
            </button>
          )}
          {currentUser.role === "ADMIN" && (
            <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
              Admin Dashboard
            </button>
          )}
          {currentUser.role === "COUNSELLOR" && (
            <button className={tab === "counsellor" ? "active" : ""} onClick={() => setTab("counsellor")}>
              Counsellor Dashboard
            </button>
          )}
        </nav>

        <div className="sidebar-note">
          <span>Role</span>
          <strong>{currentUser.role}</strong>
          <p>Manage career guidance workflows with a clean SaaS experience.</p>
        </div>
      </aside>

      <main className="dashboard-shell">
        <header className="dashboard-topbar">
          <div>
            <span className="eyebrow">Workspace</span>
            <h2>{pageTitle}</h2>
          </div>
          <div className="topbar-user">
            <div>
              <strong>{currentUser.fullName}</strong>
              <span>{currentUser.email}</span>
            </div>
            <button type="button" className="ghost-button" onClick={logout}>Logout</button>
          </div>
        </header>

        {errorMessage && <p className="error">{errorMessage}</p>}

        {tab === "student" && currentUser.role === "STUDENT" && (
          <>
            <section className="hero-banner">
              <div>
                <span className="eyebrow">Welcome back</span>
                <h3>{currentUser.fullName}</h3>
                <p>
                  Continue building your career roadmap with mentorship, curated resources, and guided counselling sessions.
                </p>
              </div>
              <div className="hero-stats">
                <DashboardStat label="Upcoming Sessions" value={studentSessions.length} />
                <DashboardStat label="Recommended Mentors" value={recommendedCounsellors.length} accent="violet" />
                <DashboardStat label="Resources" value={resources.length} accent="slate" />
              </div>
            </section>

            <div className="dashboard-grid">
              <SectionCard title="Career Roadmap" subtitle="Track your next milestone and progress">
                <div className="progress-card">
                  <div className="progress-head">
                    <strong>Roadmap completion</strong>
                    <span>72%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: "72%" }} />
                  </div>
                  <p>Focus next on live mentoring sessions and role-specific projects.</p>
                </div>
              </SectionCard>

              <SectionCard title="Quick Actions" subtitle="Fast access to common tasks">
                <div className="quick-actions-grid">
                  <QuickAction title="Book Counselling" description="Schedule your next session with a counsellor." />
                  <QuickAction title="View Roadmap" description="Review your direction across resources and sessions." />
                  <QuickAction title="Update Profile" description="Keep interests and skills aligned with your goals." />
                </div>
              </SectionCard>

              <SectionCard title="Recommended mentors" subtitle="Connect with counsellors aligned to your interests">
                <div className="stack-list">
                  {recommendedCounsellors.map((counsellor) => (
                    <div key={counsellor.id} className="list-item">
                      <div>
                        <strong>{counsellor.name}</strong>
                        <p>{counsellor.expertise}</p>
                      </div>
                      <span className="badge">{counsellor.careerPath || "Career Mentor"}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Upcoming sessions" subtitle="Your booked counselling sessions">
                <div className="stack-list">
                  {upcomingStudentSessions.length === 0 ? (
                    <p className="empty-copy">No sessions booked yet.</p>
                  ) : (
                    upcomingStudentSessions.map((session) => (
                      <div key={session.id} className="list-item">
                        <div>
                          <strong>{session.counsellor.name}</strong>
                          <p>{formatDate(session.sessionTime)}</p>
                        </div>
                        <span className="badge">{session.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Book Counselling" subtitle="Schedule your next counselling session" className="wide-card">
                <form onSubmit={bookSession} className="form">
                  <div className="form-grid">
                    <div className="field-group">
                      <label>Counsellor</label>
                      <select value={selectedCounsellor} onChange={(e) => setSelectedCounsellor(e.target.value)} required>
                        {counsellors.map((counsellor) => (
                          <option key={counsellor.id} value={counsellor.id}>
                            {counsellor.name} - {counsellor.expertise}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Date & Time</label>
                      <input type="datetime-local" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} required />
                    </div>
                    <div className="field-group">
                      <label>Mode</label>
                      <select value={mode} onChange={(e) => setMode(e.target.value)}>
                        <option value="ONLINE">ONLINE</option>
                        <option value="OFFLINE">OFFLINE</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="primary-button" disabled={!selectedStudent || !selectedCounsellor}>
                    Book Counselling
                  </button>
                </form>
              </SectionCard>

              <SectionCard title="Career resources" subtitle="Curated guides and learning paths" className="wide-card">
                <div className="stack-list">
                  {recommendedResources.map((resource) => (
                    <ResourceRow key={resource.id} resource={resource} />
                  ))}
                </div>
              </SectionCard>
            </div>
          </>
        )}

        {tab === "admin" && currentUser.role === "ADMIN" && (
          <>
            <section className="hero-banner">
              <div>
                <span className="eyebrow">Operations overview</span>
                <h3>Platform management and growth</h3>
                <p>Track registrations, maintain counsellor quality, and keep the platform organized from one workspace.</p>
              </div>
              <div className="hero-actions">
                <button type="button" className="primary-button" onClick={loadEngagement}>View Reports</button>
                <button type="button" className="ghost-button" onClick={loadAdminPeople}>Manage Users</button>
              </div>
            </section>

            <div className="dashboard-grid">
              <SectionCard title="Platform stats" subtitle="Key platform metrics at a glance" className="wide-card">
                <div className="stats-grid">
                  <DashboardStat label="Total Students" value={engagement?.totalStudents ?? "--"} />
                  <DashboardStat label="Total Counsellors" value={engagement?.totalCounsellors ?? "--"} accent="violet" />
                  <DashboardStat label="Appointments" value={engagement?.totalSessions ?? "--"} accent="slate" />
                  <DashboardStat label="Pending Requests" value={Math.max((engagement?.totalSessions ?? 0) - 1, 0)} accent="violet" />
                </div>
              </SectionCard>

              <SectionCard title="Quick Actions" subtitle="Admin controls for everyday tasks">
                <div className="quick-actions-grid">
                  <QuickAction title="Add Counsellor" description="Register and review new counsellor accounts." />
                  <QuickAction title="Manage Users" description="Review students and counsellors across the platform." />
                  <QuickAction title="View Reports" description="Track engagement, resources, and platform activity." />
                </div>
              </SectionCard>

              <SectionCard title="Counsellor approval" subtitle="Review active counsellors and career paths">
                <div className="stack-list">
                  {adminCounsellors.slice(0, 3).map((counsellor) => (
                    <div key={counsellor.id} className="list-item">
                      <div>
                        <strong>{counsellor.name}</strong>
                        <p>{counsellor.expertise}</p>
                      </div>
                      <span className="badge">{counsellor.careerPath || "Pending review"}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Platform activity" subtitle="Highlights from sessions and content">
                <div className="stack-list">
                  <div className="list-item">
                    <div>
                      <strong>Career resources live</strong>
                      <p>{resources.length} curated learning resources available.</p>
                    </div>
                    <span className="badge">Resources</span>
                  </div>
                  <div className="list-item">
                    <div>
                      <strong>Session flow</strong>
                      <p>{engagement?.totalSessions ?? 0} total counselling sessions booked.</p>
                    </div>
                    <span className="badge">Appointments</span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Add Career Resource" subtitle="Create and publish new learning resources" className="wide-card">
                <form onSubmit={addResource} className="form">
                  <div className="form-grid">
                    <div className="field-group">
                      <label>Title</label>
                      <input placeholder="Roadmap to Product Management" value={newResource.title} onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} required />
                    </div>
                    <div className="field-group">
                      <label>Career Path</label>
                      <input placeholder="Product, Design, Data..." value={newResource.careerPath} onChange={(e) => setNewResource({ ...newResource, careerPath: e.target.value })} required />
                    </div>
                  </div>
                  <div className="field-group">
                    <label>Description</label>
                    <textarea placeholder="Explain what this resource helps students achieve." value={newResource.description} onChange={(e) => setNewResource({ ...newResource, description: e.target.value })} required />
                  </div>
                  <div className="field-group">
                    <label>Resource Link</label>
                    <input placeholder="https://..." value={newResource.link} onChange={(e) => setNewResource({ ...newResource, link: e.target.value })} required />
                  </div>
                  <button type="submit" className="primary-button">Save Resource</button>
                </form>
              </SectionCard>

              <SectionCard
                title="User Management"
                subtitle="Manage registered students"
                action={<button type="button" className="ghost-button" onClick={loadAdminPeople}>Refresh</button>}
              >
                <div className="table-shell">
                  <div className="table-header">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Action</span>
                  </div>
                  {adminStudents.length === 0 ? (
                    <p className="empty-copy">No students found.</p>
                  ) : (
                    adminStudents.map((student) => (
                      <div key={student.id} className="table-row">
                        <span>{student.fullName}</span>
                        <span>{student.email}</span>
                        <button type="button" className="danger-button" onClick={() => deleteStudent(student.id)}>Delete</button>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Counsellor Management" subtitle="Review and manage counsellors">
                <div className="table-shell">
                  <div className="table-header counsellor-grid">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Career Path</span>
                    <span>Action</span>
                  </div>
                  {adminCounsellors.length === 0 ? (
                    <p className="empty-copy">No counsellors found.</p>
                  ) : (
                    adminCounsellors.map((counsellor) => (
                      <div key={counsellor.id} className="table-row counsellor-grid">
                        <span>{counsellor.name}</span>
                        <span>{counsellor.email}</span>
                        <span>{counsellor.careerPath || "Not provided"}</span>
                        <button type="button" className="danger-button" onClick={() => deleteCounsellor(counsellor.id)}>Delete</button>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          </>
        )}

        {tab === "counsellor" && currentUser.role === "COUNSELLOR" && (
          <>
            <section className="hero-banner">
              <div>
                <span className="eyebrow">Counsellor workspace</span>
                <h3>Guide your assigned students with clarity</h3>
                <p>Manage appointments, track mentorship requests, and keep notes organized in one place.</p>
              </div>
              <div className="hero-actions">
                <button type="button" className="primary-button" onClick={() => loadCounsellorSessions()}>Refresh My Students</button>
              </div>
            </section>

            <div className="dashboard-grid">
              <SectionCard title="Today's appointments" subtitle="Upcoming counselling sessions">
                <div className="stack-list">
                  {todaysAppointments.length === 0 ? (
                    <p className="empty-copy">No appointments scheduled yet.</p>
                  ) : (
                    todaysAppointments.map((session) => (
                      <div key={session.id} className="list-item">
                        <div>
                          <strong>{session.student.fullName}</strong>
                          <p>{formatDate(session.sessionTime)}</p>
                        </div>
                        <span className="badge">{session.mode}</span>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Quick Actions" subtitle="Common counsellor actions">
                <div className="quick-actions-grid">
                  <QuickAction title="Accept Request" description="Review scheduled sessions and confirm student readiness." />
                  <QuickAction title="Add Notes" description="Capture outcomes and next steps for each student." />
                  <QuickAction title="Schedule Session" description="Coordinate the next mentorship interaction." />
                </div>
              </SectionCard>

              <SectionCard title="Assigned students" subtitle="Students who booked sessions with you">
                <div className="stack-list">
                  {counsellorAssignedStudents.length === 0 ? (
                    <p className="empty-copy">No assigned students yet.</p>
                  ) : (
                    counsellorAssignedStudents.map((student) => (
                      <div key={student.id} className="list-item">
                        <div>
                          <strong>{student.fullName}</strong>
                          <p>{student.email}</p>
                        </div>
                        <span className="badge">Assigned</span>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Session requests" subtitle="Current student requests awaiting follow-up">
                <div className="stack-list">
                  {counsellorSessions.length === 0 ? (
                    <p className="empty-copy">No session requests yet.</p>
                  ) : (
                    counsellorSessions.map((session) => (
                      <div key={session.id} className="list-item">
                        <div>
                          <strong>{session.student.fullName}</strong>
                          <p>{formatDate(session.sessionTime)}</p>
                        </div>
                        <span className="badge">{session.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Student progress notes" subtitle="A simple working view for guidance follow-up" className="wide-card">
                <div className="stack-list">
                  {counsellorSessions.length === 0 ? (
                    <p className="empty-copy">Progress notes will appear here once students start booking sessions.</p>
                  ) : (
                    counsellorSessions.map((session) => (
                      <div key={session.id} className="note-card">
                        <strong>{session.student.fullName}</strong>
                        <p>Session on {formatDate(session.sessionTime)} via {session.mode}. Suggested next step: share a focused roadmap and follow-up preparation tasks.</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Career resources" subtitle="Useful references to share with students">
                <div className="stack-list">
                  {recommendedResources.map((resource) => (
                    <ResourceRow key={resource.id} resource={resource} />
                  ))}
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
