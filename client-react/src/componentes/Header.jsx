import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NavButton } from './navButtonl'
import { motion, useAnimation } from 'framer-motion';
import './Header.css'
import { siteConfigService } from '../services/api'

let siteNameCache = null

export function getSiteName() {
  return siteNameCache
}

export function Header() {
  const [showBar, setShowbar] = useState(window.innerWidth > 960)
  const [siteName, setSiteName] = useState(siteNameCache || siteConfigService.getCached()?.name || 'Sasha Gala')
  const controls = useAnimation()

  useEffect(() => {
    if (siteNameCache) return
    siteConfigService.get()
      .then(data => {
        const name = data.config?.config_data?.name
        if (name) {
          siteNameCache = name
          setSiteName(name)
        }
      })
      .catch(() => {})
  }, [])

  const navVariants = {
    open: {
      y: "0px",
      opacity: 1,
      zIndex: 100,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    closed: {
      y: "-40px",
      opacity: 0,
      zIndex: -100,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      let viewportWidth = window.innerWidth;

      if (viewportWidth > 960) {
        setShowbar(true)
        controls.start("open")
      } else {
        setShowbar(false)
        controls.start("closed")
      }
    }

    handleResize()

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [controls])

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const MAX_SHRINK = 16; // subtle shrink

    // Base vertical padding comes from CSS (50px on desktop, 9.5% on mobile).
    // We ONLY touch top/bottom (longhand) so left/right keep their own logic.
    let basePad = parseFloat(getComputedStyle(header).paddingTop) || 50;

    // The scroll container can be <body> (index.css sets body overflow-x:hidden,
    // which makes overflow-y compute to auto), so window.scrollY may stay 0.
    // Read whichever element actually scrolled.
    const getScroll = () => Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0,
    );

    const apply = () => {
      const shrink = Math.min(getScroll() / 12, MAX_SHRINK);
      const v = `${basePad - shrink}px`;
      header.style.paddingTop = v;
      header.style.paddingBottom = v;
    };

    const onResize = () => {
      // drop our inline overrides so we can re-read the CSS base, then re-apply
      header.style.paddingTop = "";
      header.style.paddingBottom = "";
      basePad = parseFloat(getComputedStyle(header).paddingTop) || 50;
      apply();
    };

    apply();
    // capture:true so we still catch the event when <body> is the scroller
    window.addEventListener("scroll", apply, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", apply, { capture: true });
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 960) {
      controls.start(showBar ? "open" : "closed")
    }
  }, [showBar, controls])

  return (
    <>
      <header>
        <div className="logo">
          <Link to='/'>
            <h1 className='header1'>{siteName}</h1>
          </Link>

          {window.innerWidth <= 960 && (
            <NavButton
              Show={showBar}
              setShow={setShowbar}
              className="navbutton"
              fill="black"
              wd="30"
              ht="30"
            />
          )}
        </div>

        <motion.div
          className="nav-links"
          variants={navVariants}
          animate={controls}
          initial={window.innerWidth > 960 ? "open" : "closed"}
        >
          <Link to='/Work'>Work</Link>
          <Link to='/Archive'>Archivo</Link>
          <Link to='/About'>About</Link>
        </motion.div>
      </header>
    </>
  )
}
