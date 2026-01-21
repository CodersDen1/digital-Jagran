import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-[#1a1a1a] text-white pt-12 pb-6">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-800 pb-8 text-center md:text-left">
                <div>
                    <h3 className="font-serif font-bold text-xl mb-4">Digital Jagaran</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Your trusted source for the latest news, in-depth analysis, and perspectives from India and around the world.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">Sections</h4>
                    <ul className="space-y-3 text-sm text-gray-300">
                        <li><a href="#" className="hover:text-white block py-1" title="India News">India</a></li>
                        <li><a href="#" className="hover:text-white block py-1" title="World News">World</a></li>
                        <li><a href="#" className="hover:text-white block py-1" title="Business News">Business</a></li>
                        <li><a href="#" className="hover:text-white block py-1" title="Technology News">Technology</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">About Us</h4>
                    <ul className="space-y-3 text-sm text-gray-300">
                        <li><a href="#" className="hover:text-white block py-1" title="Contact Us">Contact Us</a></li>
                        <li><a href="#" className="hover:text-white block py-1" title="Privacy Policy">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-white block py-1" title="Terms of Service">Terms of Service</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">Subscribe</h4>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-center md:justify-start">
                        <input type="email" placeholder="Your email" className="bg-gray-800 border-none text-sm px-3 py-2 w-full focus:ring-1 focus:ring-brand-red text-white rounded sm:rounded-r-none sm:rounded-l" />
                        <button className="bg-brand-red px-4 py-2 sm:py-0 font-bold text-sm uppercase rounded sm:rounded-l-none sm:rounded-r min-w-[80px]">Go</button>
                    </div>
                </div>
            </div>
            <div className="text-center text-gray-500 text-xs">
                &copy; {new Date().getFullYear()} Digital Jagaran. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
