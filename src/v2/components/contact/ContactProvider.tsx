"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import ContactModal from "./ContactModal";

export type ContactOptions = {
  /** Prefilled subject line. */
  subject?: string;
  /** Recipient; defaults to the team inbox. Must be one the API allows. */
  to?: string;
};

const ContactContext = createContext<(opts?: ContactOptions) => void>(() => {});

export const useContact = () => useContext(ContactContext);

// One contact modal for the whole site, opened by any <ContactLink>. `#contact`
// deep-links into it (e.g. from emails); closing drops the hash so the same
// link reopens it.
export default function ContactProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ContactOptions | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const open = useCallback((o: ContactOptions = {}) => setOpts(o), []);
  const close = () => {
    setOpts(null);
    if (window.location.hash === "#contact") {
      router.replace(pathname, { scroll: false });
    }
  };

  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#contact") setOpts({});
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  return (
    <ContactContext.Provider value={open}>
      {children}
      {opts && <ContactModal {...opts} onClose={close} />}
    </ContactContext.Provider>
  );
}
