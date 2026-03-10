import React from 'react';
import Link from 'next/link';

const Footer = () => {
    return (
        <footer className="bg-[#1a1a1a] text-white pt-12 pb-6">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-800 pb-8 text-center md:text-left">
                <div>
                    <h3 className="font-serif font-bold text-xl mb-4">Digital Jagran</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Your trusted source for the latest news, in-depth analysis, and perspectives from India and around the world — in both Hindi and English.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">Sections</h4>
                    <ul className="space-y-3 text-sm text-gray-300">
                        <li><Link href="/?category=Politics" className="hover:text-white block py-1" title="Politics News">Politics</Link></li>
                        <li><Link href="/?category=World" className="hover:text-white block py-1" title="World News">World</Link></li>
                        <li><Link href="/?category=Business" className="hover:text-white block py-1" title="Business News">Business</Link></li>
                        <li><Link href="/?category=Tech" className="hover:text-white block py-1" title="Technology News">Technology</Link></li>
                        <li><Link href="/?category=Sports" className="hover:text-white block py-1" title="Sports News">Sports</Link></li>
                        <li><Link href="/?category=Entertainment" className="hover:text-white block py-1" title="Entertainment News">Entertainment</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">Company</h4>
                    <ul className="space-y-3 text-sm text-gray-300">
                        <li><Link href="/about" className="hover:text-white block py-1" title="About Digital Jagran">About Us</Link></li>
                        <li><Link href="/contact" className="hover:text-white block py-1" title="Contact Digital Jagran">Contact Us</Link></li>
                        <li><Link href="/privacy-policy" className="hover:text-white block py-1" title="Privacy Policy">Privacy Policy</Link></li>
                        <li><Link href="/terms" className="hover:text-white block py-1" title="Terms of Service">Terms of Service</Link></li>
                        <li><Link href="/disclaimer" className="hover:text-white block py-1" title="Disclaimer">Disclaimer</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">Subscribe</h4>
                    <p className="text-gray-400 text-sm mb-3">Stay updated with the latest news delivered to your inbox.</p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-center md:justify-start">
                        <input type="email" placeholder="Your email" className="bg-gray-800 border-none text-sm px-3 py-2 w-full focus:ring-1 focus:ring-brand-red text-white rounded sm:rounded-r-none sm:rounded-l" />
                        <button className="bg-brand-red px-4 py-2 sm:py-0 font-bold text-sm uppercase rounded sm:rounded-l-none sm:rounded-r min-w-[80px]">Go</button>
                    </div>
                </div>
            </div>
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-xs">
                <p>&copy; {new Date().getFullYear()} Digital Jagran. All rights reserved.</p>
                <div className="flex items-center gap-4">
                    <Link href="/privacy-policy" className="hover:text-white">Privacy</Link>
                    <Link href="/terms" className="hover:text-white">Terms</Link>
                    <Link href="/disclaimer" className="hover:text-white">Disclaimer</Link>
                    <Link href="/contact" className="hover:text-white">Contact</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
