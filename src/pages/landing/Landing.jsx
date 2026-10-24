import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ojtlogo from '../../assets/ojtlogo.png'
import landingCss from './landing.css?inline'

const NAV_SECTIONS = ['features', 'how-it-works', 'about', 'faqs']

export default function Landing() {
  const rootRef = useRef(null)
  const toggleRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useLayoutEffect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-ojtflow-landing', '')
    style.textContent = landingCss
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let timer
    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (window.innerWidth >= 768) setMenuOpen(false)
      }, 120)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) {
      mobileMenuRef.current?.querySelector('a')?.focus()
    }
  }, [menuOpen])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const els = Array.from(root.querySelectorAll('.reveal'))
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => {
      if (el.dataset.d) el.style.setProperty('--d', el.dataset.d)
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined
    const links = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'))
    const sections = NAV_SECTIONS.map((id) => document.getElementById(id)).filter(Boolean)
    if (!links.length || !sections.length) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          links.forEach((link) =>
            link.classList.toggle('is-active', link.getAttribute('href').slice(1) === entry.target.id)
          )
        })
      },
      { rootMargin: '-35% 0px -55% 0px' }
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="ojt-landing js" ref={rootRef}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <svg xmlns="http://www.w3.org/2000/svg" className="sprite" aria-hidden="true">
        <symbol id="i-attendance" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </symbol>
        <symbol id="i-activity-log" viewBox="0 0 24 24">
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4" />
          <path d="M12 16h4" />
          <path d="M8 11h.01" />
          <path d="M8 16h.01" />
        </symbol>
        <symbol id="i-tasks" viewBox="0 0 24 24">
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </symbol>
        <symbol id="i-requirements" viewBox="0 0 24 24">
          <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="m3 15 2 2 4-4" />
        </symbol>
        <symbol id="i-progress" viewBox="0 0 24 24">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </symbol>
        <symbol id="i-arrow-right" viewBox="0 0 24 24">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </symbol>
        <symbol id="i-arrow-down" viewBox="0 0 24 24">
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </symbol>
        <symbol id="i-menu" viewBox="0 0 24 24">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </symbol>
        <symbol id="i-close" viewBox="0 0 24 24">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </symbol>
        <symbol id="i-grid" viewBox="0 0 24 24">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </symbol>
        <symbol id="i-sync" viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </symbol>
        <symbol id="i-export" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </symbol>
        <symbol id="i-grad" viewBox="0 0 24 24">
          <path d="M22 10 12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </symbol>
        <symbol id="i-home" viewBox="0 0 24 24">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </symbol>
        <symbol id="i-calendar" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </symbol>
        <symbol id="i-file" viewBox="0 0 24 24">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </symbol>
        <symbol id="i-settings" viewBox="0 0 24 24">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="2" y1="14" x2="6" y2="14" />
          <line x1="10" y1="8" x2="14" y2="8" />
          <line x1="18" y1="16" x2="22" y2="16" />
        </symbol>
        <symbol id="i-bell" viewBox="0 0 24 24">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </symbol>
        <symbol id="i-smartphone" viewBox="0 0 24 24">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </symbol>
        <symbol id="i-twitter" viewBox="0 0 24 24">
          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4 0-3 3-6 6-6 1 0 1.5.5 1.5.5s2-1 3.5-1c.5 1 0 2 0 2z" />
        </symbol>
        <symbol id="i-github" viewBox="0 0 24 24">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </symbol>
        <symbol id="i-linkedin" viewBox="0 0 24 24">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </symbol>
      </svg>

      <header className={`site-header${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' nav-open' : ''}`} id="site-header">
        <div className="header-inner container">
          <a className="brand" href="#top" aria-label="OJTFlow home">
            <span className="brand-mark" aria-hidden="true">
              <img className="brand-logo" src={ojtlogo} alt="" width="26" height="26" decoding="async" />
            </span>
            <span className="brand-name">
              OJT<span className="brand-accent">Flow</span>
            </span>
          </a>

          <nav className="main-nav" aria-label="Primary">
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#how-it-works">How It Works</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#faqs">FAQs</a>
              </li>
            </ul>
          </nav>

          <div className="header-actions">
            <Link className="sign-in" to="/login">
              Sign In
            </Link>
            <Link className="btn btn-primary btn-sm" to="/register">
              Get Started
            </Link>
            <button
              ref={toggleRef}
              className="nav-toggle"
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Menu'}
              aria-controls="mobile-menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg className="ic ic-menu" aria-hidden="true">
                <use href="#i-menu" />
              </svg>
              <svg className="ic ic-close" aria-hidden="true">
                <use href="#i-close" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="mobile-menu" id="mobile-menu" aria-label="Mobile" ref={mobileMenuRef}>
          <ul className="mobile-links">
            <li>
              <a href="#features" onClick={closeMenu}>
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" onClick={closeMenu}>
                How It Works
              </a>
            </li>
            <li>
              <a href="#about" onClick={closeMenu}>
                About
              </a>
            </li>
            <li>
              <a href="#faqs" onClick={closeMenu}>
                FAQs
              </a>
            </li>
          </ul>
          <div className="mobile-actions">
            <Link className="btn btn-primary" to="/register" onClick={closeMenu}>
              Get Started
            </Link>
            <Link className="btn btn-ghost" to="/login" onClick={closeMenu}>
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="hero-bg" aria-hidden="true"></div>
          <div className="container hero-grid">
            <div className="hero-copy reveal">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true"></span>OJT Management Platform
              </p>
              <h1>
                Monitor Your <span className="text-green">OJT Progress</span> Anytime.
              </h1>
              <p className="hero-sub">
                OJTFlow helps 4th-year students manage attendance, activities, tasks, requirements, and progress
                throughout their On-the-Job Training.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" to="/register">
                  Get Started{' '}
                  <svg className="ic" aria-hidden="true">
                    <use href="#i-arrow-right" />
                  </svg>
                </Link>
                <a className="btn btn-secondary btn-lg" href="#features">
                  Explore Features
                </a>
              </div>
            </div>

            <div className="product-visual reveal" data-d=".15s">
              <div className="product-glow" aria-hidden="true"></div>
              <div
                className="dash"
                role="img"
                aria-label="OJTFlow dashboard preview showing progress, hours, attendance, tasks, and requirements"
              >
                <aside className="dash-side">
                  <div className="dash-brand">
                    <span className="brand-mark" aria-hidden="true">
                      <img className="brand-logo" src={ojtlogo} alt="" width="20" height="20" decoding="async" />
                    </span>
                    <span className="dash-brand-name">OJTFlow</span>
                  </div>
                  <ul className="dash-nav">
                    <li className="is-active">
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-home" />
                      </svg>
                      <span>Overview</span>
                    </li>
                    <li>
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-calendar" />
                      </svg>
                      <span>Attendance</span>
                    </li>
                    <li>
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-activity-log" />
                      </svg>
                      <span>Activity Log</span>
                    </li>
                    <li>
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-tasks" />
                      </svg>
                      <span>Tasks</span>
                      <b className="nav-count">3</b>
                    </li>
                    <li>
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-requirements" />
                      </svg>
                      <span>Requirements</span>
                    </li>
                    <li>
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-progress" />
                      </svg>
                      <span>Progress</span>
                    </li>
                  </ul>
                  <div className="dash-side-foot">
                    <svg className="ic" aria-hidden="true">
                      <use href="#i-settings" />
                    </svg>
                    <span>Settings</span>
                  </div>
                </aside>

                <div className="dash-body">
                  <div className="dash-topbar">
                    <div className="dash-route">
                      Workspace <span>/</span> Overview
                    </div>
                    <div className="dash-top-right">
                      <span className="dash-date">Mon, Sep 21</span>
                      <button className="dash-icon" type="button" aria-label="Notifications">
                        <svg className="ic" aria-hidden="true">
                          <use href="#i-bell" />
                        </svg>
                      </button>
                      <span className="dash-avatar">AC</span>
                    </div>
                  </div>

                  <div className="dash-hello">
                    <div>
                      <h3>Good morning, Aiza</h3>
                      <p>You have 3.5 hrs logged today.</p>
                    </div>
                    <span className="dash-chip">
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-clock" />
                      </svg>
                      On track
                    </span>
                  </div>

                  <div className="dash-grid">
                    <div className="dash-card dash-progress">
                      <div className="dash-card-head">
                        <span>OJT Progress</span>
                        <span className="dash-sub">Week 6 of 16</span>
                      </div>
                      <div className="dash-progress-main">
                        <div className="ring" aria-hidden="true">
                          <svg viewBox="0 0 120 120">
                            <circle className="ring-bg" cx="60" cy="60" r="52"></circle>
                            <circle
                              className="ring-fg"
                              cx="60"
                              cy="60"
                              r="52"
                              pathLength="100"
                              strokeDasharray="100"
                              strokeDashoffset="32"
                            ></circle>
                          </svg>
                          <div className="ring-label">
                            <b>68%</b>
                            <span>complete</span>
                          </div>
                        </div>
                        <div className="dash-stats">
                          <div className="dash-stat">
                            <span className="stat-num">340</span>
                            <span className="stat-label">Completed hrs</span>
                          </div>
                          <div className="dash-stat">
                            <span className="stat-num">600</span>
                            <span className="stat-label">Required hrs</span>
                          </div>
                          <div className="dash-stat">
                            <span className="stat-num stat-green">260</span>
                            <span className="stat-label">Remaining hrs</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="dash-card dash-attendance">
                      <div className="dash-card-head">
                        <span>This week</span>
                        <span className="dash-sub">Hours logged</span>
                      </div>
                      <div className="bars" aria-hidden="true">
                        <div className="bar" style={{ '--h': '34%' }}>
                          <i>4</i>
                        </div>
                        <div className="bar" style={{ '--h': '68%' }}>
                          <i>8</i>
                        </div>
                        <div className="bar is-today" style={{ '--h': '52%' }}>
                          <i>6</i>
                        </div>
                        <div className="bar" style={{ '--h': '24%' }}>
                          <i>3</i>
                        </div>
                        <div className="bar" style={{ '--h': '58%' }}>
                          <i>7</i>
                        </div>
                      </div>
                      <div className="bars-labels" aria-hidden="true">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                      </div>
                      <div className="dash-week-total">
                        28<span>hrs this week</span>
                      </div>
                    </div>

                    <div className="dash-card dash-tasks">
                      <div className="dash-card-head">
                        <span>Today&apos;s tasks</span>
                        <span className="dash-sub">2 of 3 done</span>
                      </div>
                      <ul className="dash-list">
                        <li>
                          <span className="cb is-checked" aria-hidden="true"></span>
                          <span>Log morning activity</span>
                        </li>
                        <li>
                          <span className="cb is-checked" aria-hidden="true"></span>
                          <span>Update week report</span>
                        </li>
                        <li>
                          <span className="cb" aria-hidden="true"></span>
                          <span>Meet supervisor</span>
                        </li>
                      </ul>
                    </div>

                    <div className="dash-card dash-req">
                      <div className="dash-card-head">
                        <span>Requirements</span>
                        <span className="dash-sub">8 of 12</span>
                      </div>
                      <ul className="dash-list dash-req-list">
                        <li>
                          <span className="req-status done"></span>Medical clearance
                          <span className="req-pill done">Complete</span>
                        </li>
                        <li>
                          <span className="req-status done"></span>Endorsement letter
                          <span className="req-pill done">Complete</span>
                        </li>
                        <li>
                          <span className="req-status doing"></span>Training plan
                          <span className="req-pill doing">Submitted</span>
                        </li>
                        <li>
                          <span className="req-status todo"></span>Final report
                          <span className="req-pill todo">Pending</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="dash-activity">
                    <div className="dash-card-head">
                      <span>Recent activity</span>
                      <span className="dash-sub">Today</span>
                    </div>
                    <ul className="dash-activity-list">
                      <li>
                        <span className="act-ico mint">
                          <svg className="ic" aria-hidden="true">
                            <use href="#i-clock" />
                          </svg>
                        </span>
                        <span>Logged 4 hrs — Reception desk</span>
                        <time>9:20 AM</time>
                      </li>
                      <li>
                        <span className="act-ico mint">
                          <svg className="ic" aria-hidden="true">
                            <use href="#i-activity-log" />
                          </svg>
                        </span>
                        <span>Updated daily activity log</span>
                        <time>9:05 AM</time>
                      </li>
                      <li>
                        <span className="act-ico mint">
                          <svg className="ic" aria-hidden="true">
                            <use href="#i-check" />
                          </svg>
                        </span>
                        <span>Completed task: Week 5 report</span>
                        <time>Yesterday</time>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="float-card fc-hours" aria-hidden="true">
                <span className="fc-ico">
                  <svg className="ic">
                    <use href="#i-progress" />
                  </svg>
                </span>
                <div>
                  <b>3.5 hrs</b>
                  <span>Logged today</span>
                </div>
              </div>
              <div className="float-card fc-streak" aria-hidden="true">
                <span className="fc-ico">
                  <svg className="ic">
                    <use href="#i-check" />
                  </svg>
                </span>
                <div>
                  <b>Week 6 of 16</b>
                  <span>On track to finish</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="value-strip" aria-label="Key benefits">
          <div className="container value-grid reveal">
            <div className="value-item">
              <span className="icon-box sm" aria-hidden="true">
                <svg className="ic">
                  <use href="#i-grid" />
                </svg>
              </span>
              <div>
                <h3>One organized workspace</h3>
                <p>Attendance, activities, tasks, and requirements live together.</p>
              </div>
            </div>
            <div className="value-item">
              <span className="icon-box sm" aria-hidden="true">
                <svg className="ic">
                  <use href="#i-sync" />
                </svg>
              </span>
              <div>
                <h3>Always current</h3>
                <p>Every hour and entry updates your progress in real time.</p>
              </div>
            </div>
            <div className="value-item">
              <span className="icon-box sm" aria-hidden="true">
                <svg className="ic">
                  <use href="#i-export" />
                </svg>
              </span>
              <div>
                <h3>Coordinator-ready</h3>
                <p>Export clean summaries for your coordinator, any time.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="features section" id="features">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true"></span>Everything you need
              </p>
              <h2>One workspace for your whole OJT.</h2>
              <p className="section-sub">Five focused tools that keep every part of On-the-Job Training under control.</p>
            </div>

            <div className="features-grid">
              <article className="feature-card reveal">
                <span className="icon-box" aria-hidden="true">
                  <svg className="ic">
                    <use href="#i-attendance" />
                  </svg>
                </span>
                <h3>Attendance Tracking</h3>
                <p>
                  Log your daily time in one tap, capture in and out, and watch your required hours add up
                  automatically.
                </p>
                <div className="feature-viz viz-bars" aria-hidden="true">
                  <div className="bars">
                    <div className="bar" style={{ '--h': '40%' }}></div>
                    <div className="bar" style={{ '--h': '72%' }}></div>
                    <div className="bar is-today" style={{ '--h': '55%' }}></div>
                    <div className="bar" style={{ '--h': '30%' }}></div>
                    <div className="bar" style={{ '--h': '64%' }}></div>
                    <div className="bar" style={{ '--h': '48%' }}></div>
                    <div className="bar" style={{ '--h': '61%' }}></div>
                  </div>
                </div>
              </article>

              <article className="feature-card reveal" data-d=".08s">
                <span className="icon-box" aria-hidden="true">
                  <svg className="ic">
                    <use href="#i-activity-log" />
                  </svg>
                </span>
                <h3>Activity Log</h3>
                <p>
                  Record what you worked on each day, organized by shift, so your daily narratives are ready when you
                  need them.
                </p>
                <div className="feature-viz viz-log" aria-hidden="true">
                  <div className="log-row">
                    <i className="st mint"></i>
                    <span>Reception desk — 4 hrs</span>
                    <b>09:00</b>
                  </div>
                  <div className="log-row">
                    <i className="st green"></i>
                    <span>Filing &amp; records</span>
                    <b>10:30</b>
                  </div>
                  <div className="log-row">
                    <i className="st navy"></i>
                    <span>Team meeting notes</span>
                    <b>13:00</b>
                  </div>
                </div>
              </article>

              <article className="feature-card reveal" data-d=".16s">
                <span className="icon-box" aria-hidden="true">
                  <svg className="ic">
                    <use href="#i-tasks" />
                  </svg>
                </span>
                <h3>Task Management</h3>
                <p>
                  Keep assignments, subtasks, and deadlines in a simple list that updates your plan every time you
                  check one off.
                </p>
                <div className="feature-viz viz-tasks" aria-hidden="true">
                  <div className="task-row">
                    <span className="cb is-checked" aria-hidden="true"></span>
                    <span>Draft week report</span>
                  </div>
                  <div className="task-row">
                    <span className="cb is-checked" aria-hidden="true"></span>
                    <span>Prepare presentation</span>
                  </div>
                  <div className="task-row">
                    <span className="cb" aria-hidden="true"></span>
                    <span>Coordinate with HR</span>
                  </div>
                </div>
              </article>

              <article className="feature-card wide reveal">
                <span className="icon-box" aria-hidden="true">
                  <svg className="ic">
                    <use href="#i-requirements" />
                  </svg>
                </span>
                <h3>Requirements Tracker</h3>
                <p>
                  A complete list of school requirements — medical clearance, reports, evaluations with clear status for
                  every document.
                </p>
                <div className="feature-viz viz-req" aria-hidden="true">
                  <div className="req-bar">
                    <span className="req-fill" style={{ width: '66%' }}></span>
                  </div>
                  <div className="req-bar-meta">
                    <span>8 of 12 requirements complete</span>
                    <b>66%</b>
                  </div>
                </div>
              </article>

              <article className="feature-card wide reveal" data-d=".08s">
                <span className="icon-box" aria-hidden="true">
                  <svg className="ic">
                    <use href="#i-progress" />
                  </svg>
                </span>
                <h3>Progress Overview</h3>
                <p>
                  A clear view of hours completed, weeks remaining, and overall training progress so you always know
                  where you stand.
                </p>
                <div className="feature-viz viz-progress" aria-hidden="true">
                  <div className="spark-line">
                    <svg viewBox="0 0 320 72" preserveAspectRatio="none">
                      <path
                        d="M0 56 C 30 60, 45 44, 70 40 S 110 34, 135 28 S 180 30, 205 20 S 255 16, 280 10 S 310 8, 320 6"
                        fill="none"
                        stroke="#0F9D7A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M0 56 C 30 60, 45 44, 70 40 S 110 34, 135 28 S 180 30, 205 20 S 255 16, 280 10 S 310 8, 320 6 V72 H0 Z"
                        fill="#E8F7F2"
                      />
                    </svg>
                  </div>
                  <div className="spark-meta">
                    <span>340 of 600 hours</span>
                    <b className="text-green">+38 hrs this week</b>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="deep-dive section">
          <div className="container">
            <div className="spotlight">
              <div className="spot-copy reveal">
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden="true"></span>Attendance &amp; progress
                </p>
                <h2>Track every hour of your OJT.</h2>
                <p>
                  Your required hours are always front and center. Log time during your shift, and OJTFlow keeps a
                  running count of what&apos;s done, what&apos;s left, and how your weeks compare.
                </p>
                <ul className="check-list">
                  <li>
                    <span className="check-bullet" aria-hidden="true">
                      <svg className="ic">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Daily time-in and time-out logging
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">
                      <svg className="ic">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Weekly and monthly hour summaries
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">
                      <svg className="ic">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Remaining hours recalculated in real time
                  </li>
                </ul>
              </div>
              <div className="spot-visual reveal" data-d=".12s">
                <div className="spot-card spot-hours" role="img" aria-label="Weekly attendance chart preview">
                  <div className="dash-card-head">
                    <span>Hours logged</span>
                    <span className="dash-sub">Last 8 weeks</span>
                  </div>
                  <div className="spot-bars" aria-hidden="true">
                    <div className="bar" style={{ '--h': '42%' }}></div>
                    <div className="bar" style={{ '--h': '58%' }}></div>
                    <div className="bar" style={{ '--h': '50%' }}></div>
                    <div className="bar" style={{ '--h': '72%' }}></div>
                    <div className="bar" style={{ '--h': '64%' }}></div>
                    <div className="bar" style={{ '--h': '80%' }}></div>
                    <div className="bar is-today" style={{ '--h': '70%' }}></div>
                    <div className="bar" style={{ '--h': '24%' }}></div>
                  </div>
                  <div className="spot-bars-labels" aria-hidden="true">
                    <span>W1</span>
                    <span>W2</span>
                    <span>W3</span>
                    <span>W4</span>
                    <span>W5</span>
                    <span>W6</span>
                    <span>W7</span>
                    <span>W8</span>
                  </div>
                  <div className="spot-chips">
                    <span className="dash-chip">
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-clock" />
                      </svg>
                      34.5 hrs this week
                    </span>
                    <span className="dash-chip muted">
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-calendar" />
                      </svg>
                      5 days present
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="spotlight reverse">
              <div className="spot-copy reveal">
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden="true"></span>Requirements
                </p>
                <h2>Never miss a requirement.</h2>
                <p>
                  From medical clearance to your final evaluation, every document has a place. Track what&apos;s
                  submitted, what&apos;s pending, and what&apos;s due next in one glance.
                </p>
                <ul className="check-list">
                  <li>
                    <span className="check-bullet" aria-hidden="true">
                      <svg className="ic">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Status labels for every requirement
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">
                      <svg className="ic">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Due dates tracked for every requirement
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">
                      <svg className="ic">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    One-click summary for your coordinator
                  </li>
                </ul>
              </div>
              <div className="spot-visual reveal" data-d=".12s">
                <div className="spot-card spot-req" role="img" aria-label="Requirements checklist preview">
                  <div className="dash-card-head">
                    <span>Requirements</span>
                    <span className="dash-sub">Semester 2026</span>
                  </div>
                  <ul className="dash-list dash-req-list">
                    <li>
                      <span className="req-status done"></span>Medical clearance
                      <span className="req-pill done">Complete</span>
                    </li>
                    <li>
                      <span className="req-status done"></span>Endorsement letter
                      <span className="req-pill done">Complete</span>
                    </li>
                    <li>
                      <span className="req-status doing"></span>Training plan
                      <span className="req-pill doing">Submitted</span>
                    </li>
                    <li>
                      <span className="req-status doing"></span>Midterm evaluation
                      <span className="req-pill doing">Due in 3 days</span>
                    </li>
                    <li>
                      <span className="req-status todo"></span>Final report
                      <span className="req-pill todo">Pending</span>
                    </li>
                  </ul>
                  <div className="spot-req-foot">
                    <button className="btn btn-soft btn-sm" type="button">
                      <svg className="ic" aria-hidden="true">
                        <use href="#i-export" />
                      </svg>
                      Export summary
                    </button>
                    <span className="dash-sub">8 of 12 complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works section" id="how-it-works">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true"></span>How it works
              </p>
              <h2>From first day to final report.</h2>
              <p className="section-sub">Four simple steps carry you through the entire OJT journey.</p>
            </div>
            <ol className="steps">
              <li className="step reveal">
                <span className="step-num" aria-hidden="true">
                  01
                </span>
                <h3>Set Up</h3>
                <p>Create your profile and add your company, training details, and required hours list.</p>
              </li>
              <li className="step reveal" data-d=".08s">
                <span className="step-num" aria-hidden="true">
                  02
                </span>
                <h3>Track</h3>
                <p>Log attendance and daily activities as you work a few taps a day is all it takes.</p>
              </li>
              <li className="step reveal" data-d=".16s">
                <span className="step-num" aria-hidden="true">
                  03
                </span>
                <h3>Complete</h3>
                <p>Finish tasks and mark requirements as completed with supporting notes attached.</p>
              </li>
              <li className="step reveal" data-d=".24s">
                <span className="step-num" aria-hidden="true">
                  04
                </span>
                <h3>Monitor</h3>
                <p>Follow your hours and progress bar week by week, all the way to your final days.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="big-preview section" aria-label="Large product preview">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true"></span>Product
              </p>
              <h2>Your progress, at a glance.</h2>
              <p className="section-sub">The Progress Overview keeps every part of your OJT clearly in view.</p>
            </div>

            <div className="browser reveal">
              <div className="browser-bar">
                <span className="win-dots" aria-hidden="true">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span className="browser-url">
                  <svg className="ic" aria-hidden="true">
                    <use href="#i-shield" />
                  </svg>
                  ojtflow.pages.dev
                </span>
                <span className="browser-actions" aria-hidden="true"></span>
              </div>
              <div className="browser-body">
                <div className="dash-lg" role="img" aria-label="Large OJTFlow progress dashboard preview">
                  <div className="dash-lg-top">
                    <ul className="seg">
                      <li>Overview</li>
                      <li>Attendance</li>
                      <li>Activity Log</li>
                      <li>Tasks</li>
                      <li>Requirements</li>
                      <li className="is-active">Progress</li>
                    </ul>
                    <div className="dash-lg-account">
                      <button className="dash-icon" type="button" aria-label="Search">
                        <svg className="ic" aria-hidden="true">
                          <use href="#i-search" />
                        </svg>
                      </button>
                      <button className="dash-icon" type="button" aria-label="Notifications">
                        <svg className="ic" aria-hidden="true">
                          <use href="#i-bell" />
                        </svg>
                      </button>
                      <span className="dash-avatar">AC</span>
                    </div>
                  </div>

                  <div className="dash-lg-stats">
                    <div className="lg-stat">
                      <span className="dash-sub">Total required</span>
                      <b>
                        600 <small>hrs</small>
                      </b>
                    </div>
                    <div className="lg-stat">
                      <span className="dash-sub">Completed</span>
                      <b className="text-green">
                        340 <small>hrs</small>
                      </b>
                    </div>
                    <div className="lg-stat">
                      <span className="dash-sub">Remaining</span>
                      <b>
                        260 <small>hrs</small>
                      </b>
                    </div>
                    <div className="lg-stat">
                      <span className="dash-sub">Progress</span>
                      <b>
                        68<small>%</small>
                      </b>
                      <span className="mini-bar" aria-hidden="true">
                        <i style={{ width: '68%' }}></i>
                      </span>
                    </div>
                  </div>

                  <div className="dash-lg-main">
                    <div className="lg-chart card">
                      <div className="dash-card-head">
                        <span>Hours over time</span>
                        <span className="dash-chip dl-legend">
                          <i className="lg-dot" aria-hidden="true"></i>This year
                        </span>
                      </div>
                      <div className="lg-chart-wrap">
                        <svg
                          viewBox="0 0 640 200"
                          preserveAspectRatio="none"
                          role="img"
                          aria-label="Area chart showing increasing hours over the semester"
                        >
                          <defs>
                            <linearGradient id="lg-area" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0" stopColor="#0F9D7A" stopOpacity=".22"></stop>
                              <stop offset="1" stopColor="#0F9D7A" stopOpacity="0"></stop>
                            </linearGradient>
                          </defs>
                          <g className="lg-grid" stroke="#E2E9E6" strokeWidth="1">
                            <line x1="0" y1="20" x2="640" y2="20"></line>
                            <line x1="0" y1="66" x2="640" y2="66"></line>
                            <line x1="0" y1="112" x2="640" y2="112"></line>
                            <line x1="0" y1="158" x2="640" y2="158"></line>
                          </g>
                          <path
                            d="M0 170 C 50 162, 80 150, 120 148 C 160 146, 180 128, 220 126 C 260 124, 300 96, 340 98 C 380 100, 420 74, 460 70 C 500 66, 560 40, 640 34 L 640 200 L 0 200 Z"
                            fill="url(#lg-area)"
                          ></path>
                          <path
                            d="M0 170 C 50 162, 80 150, 120 148 C 160 146, 180 128, 220 126 C 260 124, 300 96, 340 98 C 380 100, 420 74, 460 70 C 500 66, 560 40, 640 34"
                            fill="none"
                            stroke="#0F9D7A"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                          <circle cx="640" cy="34" r="5" fill="#0F9D7A" stroke="#fff" strokeWidth="2"></circle>
                        </svg>
                      </div>
                      <div className="lg-labels" aria-hidden="true">
                        <span>Week 1</span>
                        <span>Week 4</span>
                        <span>Week 8</span>
                        <span>Week 12</span>
                        <span>Week 16</span>
                      </div>
                      <div className="spot-chips">
                        <span className="dash-chip">
                          <svg className="ic" aria-hidden="true">
                            <use href="#i-progress" />
                          </svg>
                          68% complete
                        </span>
                        <span className="dash-chip muted">
                          <svg className="ic" aria-hidden="true">
                            <use href="#i-clock" />
                          </svg>
                          12 weeks logged
                        </span>
                      </div>
                    </div>

                    <div className="card lg-side">
                      <div className="dash-card-head">
                        <span>Up next</span>
                        <span className="dash-sub">This week</span>
                      </div>
                      <ul className="dash-list">
                        <li>
                          <span className="cb is-checked" aria-hidden="true"></span>
                          <span>Submit attendance sheet</span>
                        </li>
                        <li>
                          <span className="cb is-checked" aria-hidden="true"></span>
                          <span>Complete week 6 log</span>
                        </li>
                        <li>
                          <span className="cb" aria-hidden="true"></span>
                          <span>Prepare midterm eval docs</span>
                        </li>
                        <li>
                          <span className="cb" aria-hidden="true"></span>
                          <span>Meet coordinator</span>
                        </li>
                      </ul>
                      <div className="dash-card-head lg-side-head">
                        <span>This week</span>
                      </div>
                      <div className="dash-week-total inline">
                        <span>28</span>
                        <span className="dash-sub">hrs logged</span>
                      </div>
                      <div className="bars mini" aria-hidden="true">
                        <div className="bar" style={{ '--h': '34%' }}></div>
                        <div className="bar" style={{ '--h': '68%' }}></div>
                        <div className="bar is-today" style={{ '--h': '52%' }}></div>
                        <div className="bar" style={{ '--h': '24%' }}></div>
                        <div className="bar" style={{ '--h': '58%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="float-card fc-done" aria-hidden="true">
                  <span className="fc-ico success">
                    <svg className="ic">
                      <use href="#i-check" />
                    </svg>
                  </span>
                  <div>
                    <b>Task completed</b>
                    <span>Daily activity log saved</span>
                  </div>
                </div>
                <div className="float-card fc-total" aria-hidden="true">
                  <span className="fc-ico">
                    <svg className="ic">
                      <use href="#i-tasks" />
                    </svg>
                  </span>
                  <div>
                    <b>340 / 600 hrs</b>
                    <span>Completed for the term</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="benefits section" id="about">
          <div className="container benefits-grid">
            <div className="benefits-copy reveal">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true"></span>About
              </p>
              <h2>Built around your training journey.</h2>
              <p className="section-sub">
                OJTFlow is designed with 4th-year students in mind  simple enough to use daily, complete enough to
                trust all semester.
              </p>
              <ul className="check-list">
                <li>
                  <span className="check-bullet" aria-hidden="true">
                    <svg className="ic">
                      <use href="#i-check" />
                    </svg>
                  </span>
                  Flexible setup for any course or company
                </li>
                <li>
                  <span className="check-bullet" aria-hidden="true">
                    <svg className="ic">
                      <use href="#i-check" />
                    </svg>
                  </span>
                  Clean, export-ready reports for coordinators
                </li>
                <li>
                  <span className="check-bullet" aria-hidden="true">
                    <svg className="ic">
                      <use href="#i-check" />
                    </svg>
                  </span>
                  Private by default — your records stay yours
                </li>
                <li>
                  <span className="check-bullet" aria-hidden="true">
                    <svg className="ic">
                      <use href="#i-check" />
                    </svg>
                  </span>
                  Works great on the phone you carry every day
                </li>
              </ul>
              <Link className="btn btn-secondary btn-lg" to="/register">
                Get Started Free
              </Link>
            </div>

            <div className="benefits-visual reveal" data-d=".12s">
              <div className="summary-email" role="img" aria-label="Weekly summary preview">
                <div className="email-top">
                  <span className="brand-mark" aria-hidden="true">
                    <img className="brand-logo" src={ojtlogo} alt="" width="22" height="22" decoding="async" />
                  </span>
                  <div className="email-from">
                    <b>Your weekly overview</b>
                    <span>Progress updated as you log</span>
                  </div>
                  <span className="email-pill">OJTFlow</span>
                </div>
                <div className="email-body">
                  <div className="email-greet">
                    <h3>Week 6, Ana</h3>
                    <p>Nice steady week. Here&apos;s where your OJT stands.</p>
                  </div>
                  <div className="email-stats">
                    <div className="e-stat">
                      <span className="dash-sub">Hours logged</span>
                      <b>18.5</b>
                    </div>
                    <div className="e-stat">
                      <span className="dash-sub">Tasks done</span>
                      <b>
                        4<span>/6</span>
                      </b>
                    </div>
                    <div className="e-stat">
                      <span className="dash-sub">New requirement</span>
                      <b className="text-green">1</b>
                    </div>
                  </div>
                  <div className="email-bar" aria-hidden="true">
                    <span className="req-fill" style={{ width: '68%' }}></span>
                  </div>
                  <span className="email-bar-meta">68% toward your 600 required hours</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="faqs section" id="faqs">
          <div className="container faq-inner">
            <div className="section-head reveal">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true"></span>FAQs
              </p>
              <h2>Questions, answered.</h2>
            </div>
            <div className="faq-list reveal">
              <details className="faq-item">
                <summary>
                  Is OJTFlow free for students?<span className="faq-plus" aria-hidden="true"></span>
                </summary>
                <p>
                  Yes. Core features for students are free, so you can log hours, tasks, and requirements from day one
                  without any cost.
                </p>
              </details>
              <details className="faq-item">
                <summary>
                  Does OJTFlow work on my phone?<span className="faq-plus" aria-hidden="true"></span>
                </summary>
                <p>
                  Yes. The workspace is responsive, so you can log attendance, activities, and tasks from any device
                  with a browser.
                </p>
              </details>
              <details className="faq-item">
                <summary>
                  How do I log my daily hours?<span className="faq-plus" aria-hidden="true"></span>
                </summary>
                <p>
                  Open Attendance, tap to start and end your shift, and optionally set the task or activity covered.
                  Your totals update instantly.
                </p>
              </details>
              <details className="faq-item">
                <summary>
                  Can my coordinator or supervisor access my records?<span className="faq-plus" aria-hidden="true"></span>
                </summary>
                <p>You stay in control. You can generate a shareable summary or report whenever your coordinator requests one.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="final-cta" id="cta">
          <div className="cta-glow" aria-hidden="true"></div>
          <div className="container cta-inner reveal">
            <p className="eyebrow light">
              <span className="eyebrow-dot" aria-hidden="true"></span>Start your OJT the organized way
            </p>
            <h2>Stay organized throughout your OJT.</h2>
            <p>
              Set up your workspace in minutes and keep every hour, activity, task, and requirement in one place from
              your first week.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-light btn-lg" to="/register">
                Get Started{' '}
                <svg className="ic" aria-hidden="true">
                  <use href="#i-arrow-right" />
                </svg>
              </Link>
              <a className="btn btn-ghost-light btn-lg" href="#features">
                Explore Features
              </a>
            </div>
            <p className="cta-note">Free for students · No credit card required</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a className="brand footer-brand-link" href="#top" aria-label="OJTFlow home">
                <span className="brand-mark" aria-hidden="true">
                  <img className="brand-logo" src={ojtlogo} alt="" width="26" height="26" decoding="async" />
                </span>
                <span className="brand-name">
                  OJT<span className="brand-accent">Flow</span>
                </span>
              </a>
              <p>The organized workspace for 4th-year students completing their On-the-Job Training.</p>
              <div className="footer-social">
                <a href="#top" aria-label="OJTFlow on Twitter">
                  <svg className="ic">
                    <use href="#i-twitter" />
                  </svg>
                </a>
                <a href="#top" aria-label="OJTFlow on GitHub">
                  <svg className="ic">
                    <use href="#i-github" />
                  </svg>
                </a>
                <a href="#top" aria-label="OJTFlow on LinkedIn">
                  <svg className="ic">
                    <use href="#i-linkedin" />
                  </svg>
                </a>
              </div>
            </div>
            <nav className="footer-col" aria-label="Product">
              <h3>Product</h3>
              <ul>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#how-it-works">How It Works</a>
                </li>
                <li>
                  <a href="#about">About</a>
                </li>
                <li>
                  <a href="#faqs">FAQs</a>
                </li>
              </ul>
            </nav>
            <nav className="footer-col" aria-label="Students">
              <h3>For Students</h3>
              <ul>
                <li>
                  <a href="#how-it-works">Getting started</a>
                </li>
                <li>
                  <a href="#faqs">Help center</a>
                </li>
                <li>
                  <a href="#how-it-works">OJT guide</a>
                </li>
                <li>
                  <Link to="/register">Sign up</Link>
                </li>
              </ul>
            </nav>
            <nav className="footer-col" aria-label="Company">
              <h3>Company</h3>
              <ul>
                <li>
                  <a href="#about">About us</a>
                </li>
                <li>
                  <a href="#cta">Careers</a>
                </li>
                <li>
                  <a href="#top">Privacy</a>
                </li>
                <li>
                  <a href="#top">Terms</a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 OJTFlow. All rights reserved.</p>
            <p>Made for 4th-year students.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
