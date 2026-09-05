"use client";

import { createContext, useContext, useEffect, useState } from "react";

type NavState = { open: boolean; toggle: () => void };

const NavStateContext = createContext<NavState>({ open: true, toggle: () => {} });

export function NavStateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("coachnat_nav_open");
    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount
      setOpen(stored === "1");
    }
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem("coachnat_nav_open", next ? "1" : "0");
      return next;
    });
  }

  return <NavStateContext.Provider value={{ open, toggle }}>{children}</NavStateContext.Provider>;
}

export function useNavState() {
  return useContext(NavStateContext);
}
