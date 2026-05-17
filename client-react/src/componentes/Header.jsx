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
  const [siteName, setSiteName] = useState(siteNameCache || 'Sasha Gala')
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
      opacity: 1,
      zIndex: 100,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    closed: {
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
    const handleScroll = () => {
      const header = document.querySelector("header");
      if (header) {
        const newPadding = 50 - Math.min(window.scrollY / 12, 25);
        header.style.padding = `${newPadding}px 50px`;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
