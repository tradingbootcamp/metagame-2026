import SignupForm from "./SignupForm";

// Heading + form only; the caller supplies the surrounding column so the contact
// line below stays a sibling at the same gap. Fragment keeps the DOM flat.
export default function NotifyMe() {
  return (
    <>
      <p className="m-0 text-center font-[family-name:var(--font-bebas)] text-[clamp(26px,6vw,38px)] leading-tight tracking-[0.05em]">
        Get notified
        <br />
        <span className="block text-center font-sans text-[clamp(15px,3.6vw,22px)] leading-[1.2] font-normal tracking-normal not-italic">
          About ticket sales, updates, volunteer opportunities, and more
        </span>
      </p>
      <SignupForm />
    </>
  );
}
