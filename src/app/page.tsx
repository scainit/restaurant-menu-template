import Link from "next/link";
import { Phone, Wallet, MessageCircle } from "lucide-react";

const branches = [
  { name: "Mokattam Branch", arabic: "فرع المقطم", phone: "01070845123", href: "tel:+201070845123" },
  { name: "Maadi Branch", arabic: "فرع المعادي", phone: "01005607986", href: "tel:+201005607986" },
];

export default function Home() {
  return (
    <main className="landing-page">
      <section className="landing-main">
        <span className="landing-kicker">WELCOME TO</span>
        <h1>Bistro House</h1>
        <nav className="landing-actions" aria-label="Main links">
          <Link className="landing-action landing-action-primary" href="/menu">Menu</Link>
          <a className="landing-action" href="https://search.google.com/local/writereview?placeid=ChIJ570n72s5WBQRuDVDWE0VLA0" target="_blank" rel="noopener noreferrer">قيّم فرعنا في المقطم</a>
          <a className="landing-action" href="https://maps.app.goo.gl/iYDLdsqpLvorw8EE8" target="_blank" rel="noopener noreferrer">زرنا في فرع المقطم</a>
          <button className="landing-action landing-action-disabled" type="button" disabled>
            <Wallet size={17} /> InstaPay
          </button>
        </nav>
      </section>

      <section id="contact" className="landing-contact">
        <h2>Contact our branches</h2>
        <div className="landing-branches">
          {branches.map((branch) => (
            <article className="landing-branch" key={branch.phone}>
              <div>
                <h3>{branch.name}</h3>
                <p>{branch.arabic}</p>
              </div>
              <div className="landing-branch-actions">
                <a href={branch.href} aria-label={`Call ${branch.name}`}>
                  <Phone size={16} /> Call this branch
                </a>
                <a href={`https://wa.me/${branch.phone === "01070845123" ? "201070845123" : "201005607986"}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${branch.name}`}>
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer className="landing-footer">© {new Date().getFullYear()} Bistro House</footer>
    </main>
  );
}
