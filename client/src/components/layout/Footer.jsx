import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-[#1a1a1a] text-white pt-12 pb-6">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-800 pb-8">
                <div>
                    <h3 className="font-serif font-bold text-xl mb-4">Digital Jagaran</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Your trusted source for the latest news, in-depth analysis, and perspectives from India and around the world.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">Sections</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li><a href="#" className="hover:text-white">India</a></li>
                        <li><a href="#" className="hover:text-white">World</a></li>
                        <li><a href="#" className="hover:text-white">Business</a></li>
                        <li><a href="#" className="hover:text-white">Technology</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">About Us</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li><a href="#" className="hover:text-white">Contact Us</a></li>
                        <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4 uppercase text-sm tracking-wider text-gray-500">Subscribe</h4>
                    <div className="flex">
                        <input type="email" placeholder="Your email" className="bg-gray-800 border-none text-sm px-3 py-2 w-full focus:ring-1 focus:ring-brand-red text-white" />
                        <button className="bg-brand-red px-4 font-bold text-sm uppercase">Go</button>
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
