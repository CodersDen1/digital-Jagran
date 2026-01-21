const mongoose = require('mongoose');
const Article = require('./models/Article');
const LayoutTemplate = require('./models/LayoutTemplate');
require('dotenv').config();

const articlesData = {
    'Politics': [
        {
            headline: "CEC Emphasizes Pure Voters' List as Key to Democracy",
            summary: "Chief Election Commissioner Gyanesh Kumar highlights the importance of an error-free electoral roll, citing Bihar's successful revision.",
            body: "Chief Election Commissioner Gyanesh Kumar has strongly emphasized the critical role of a 'pure' voters' list in strengthening the foundations of democracy. Speaking at a recent event, Kumar referenced the recent revision exercise in Bihar, which he claimed saw zero complaints, as a model for the rest of the country.\n\nHe stated that an accurate electoral roll is the first step towards a fair election. The Commission is now focusing on technology-driven solutions to ensure that duplicate entries are removed and eligible voters are seamlessly added.",
            image: "https://placehold.co/1200x600/e63946/ffffff?text=CEC+Voters+List",
            tags: ["Elections", "Democracy", "India"]
        },
        {
            headline: "Lok Sabha Attendance to be Marked from Seats in Budget Session",
            summary: "Speaker Om Birla announces a digital shift: MPs will now mark their attendance directly from their seats starting this session.",
            body: "In a move towards digitalization and efficiency, Lok Sabha Speaker Om Birla has announced that members of the house will now mark their attendance digitally from their allocated seats. This change is set to come into effect from the upcoming Budget Session.\n\nPreviously, members had to sign a register. The new system is expected to streamline the process and save time during the proceedings of the House. This is part of a larger 'e-Sansad' initiative.",
            image: "https://placehold.co/1200x600/1d3557/ffffff?text=Lok+Sabha+Digital",
            tags: ["Parliament", "India", "Digital"]
        },
        {
            headline: "TTV Dhinakaran's AMMK Re-joins NDA Alliance in Tamil Nadu",
            summary: "A significant political realignment in Tamil Nadu as TTV Dhinakaran pledges support to the NDA ahead of elections.",
            body: "The political landscape in Tamil Nadu has seen a significant shift as TTV Dhinakaran's Amma Makkal Munnetra Kazhagam (AMMK) has officially rejoined the National Democratic Alliance (NDA).\n\nThe move is expected to bolster the NDA's presence in the southern state. Dhinakaran stated that the alliance is based on a shared vision for the development of Tamil Nadu and the nation.",
            image: "https://placehold.co/1200x600/f4a261/ffffff?text=AMMK+NDA+Alliance",
            tags: ["Tamil Nadu", "Politics", "Alliance"]
        },
        {
            headline: "Trump's Greenland Comments Spark Outrage Among EU Leaders",
            summary: "Former US President Donald Trump's renewed interest in Greenland and tariff threats have unnerved European allies.",
            body: "Former President Donald Trump has once again stirred geopolitical waters with comments regarding Greenland, combined with threats of new tariffs on European goods. These statements have drawn sharp criticism from EU leaders, who see them as a threat to the stability of the trans-Atlantic partnership.\n\nDiplomats in Brussels are reportedly scrambling to prepare responses, fearing that such rhetoric could escalate into a trade war or weaken NATO alliances.",
            image: "https://placehold.co/1200x600/457b9d/ffffff?text=Trump+Greenland",
            tags: ["US Politics", "EU", "Diplomacy"]
        },
        {
            headline: "Surging Billionaire Wealth Poses Political Threat: Oxfam",
            summary: "As Davos kicks off, Oxfam warns that the $18.3 trillion wealth of billionaires is creating a global political imbalance.",
            body: "A new report by Oxfam, released to coincide with the World Economic Forum in Davos, warns that the concentration of wealth among the world's billionaires has reached dangerous levels. The report states that their combined wealth now stands at $18.3 trillion.\n\nOxfam argues that this extreme inequality creates a 'political threat' by allowing the ultra-wealthy to disproportionately influence government policies and undermine democratic institutions worldwide.",
            image: "https://placehold.co/1200x600/2a9d8f/ffffff?text=Wealth+Inequality",
            tags: ["Economy", "Davos", "Global"]
        }
    ],
    'Business': [
        {
            headline: "Sensex Sees Volatility: Crashes 2400 Points Before Rebound",
            summary: "Indian markets witnessed a roller-coaster ride as the Sensex plunged significantly before a midday recovery.",
            body: "The Indian stock market has been experiencing extreme volatility this week. The benchmark Sensex crashed by nearly 2400 points over three trading sessions, wiping out almost ₹6 lakh crore in investor wealth.\n\nHowever, bargain hunting led to a sharp midday rebound today. Analysts attribute the volatility to a mix of global cues, valuation concerns, and profit-booking.",
            image: "https://placehold.co/800x450/264653/ffffff?text=Sensex+Volatility",
            tags: ["Stock Market", "Sensex", "India"]
        },
        {
            headline: "Gold and Silver Hit Record Highs Amidst Global Uncertainty",
            summary: "Safe-haven demand pushes gold past ₹1.57 lakh and silver to new peaks.",
            body: "Gold and silver prices have surged to fresh record highs. Domestic gold prices on the MCX extended gains to reach ₹1.57 lakh, while spot gold globally crossed the $4,800 an ounce mark.\n\nSilver also shadowed this rally, peaking at $95.87. Experts suggest that geopolitical tensions and economic uncertainties are driving investors towards these safe-haven assets.",
            image: "https://placehold.co/800x450/e9c46a/000000?text=Gold+Record+Highs",
            tags: ["Commodities", "Gold", "Finance"]
        },
        {
            headline: "Rupee Hits Record Low Against US Dollar",
            summary: "The Indian Rupee slips to 91.50 against the USD, adding to import cost concerns.",
            body: "The Indian Rupee has depreciated to a new all-time low, trading at 91.50 against the US Dollar. The fall is attributed to a strengthening dollar index and sustained capital outflows.\n\nCurrency experts warn that this could increase the country's import bill, particularly for crude oil and electronics, potentially widening the trade deficit.",
            image: "https://placehold.co/800x450/e76f51/ffffff?text=Rupee+Record+Low",
            tags: ["Currency", "Forex", "Economy"]
        },
        {
            headline: "Jharkhand Signs ₹11,000 Cr Steel MoU with Tata at WEF",
            summary: "A major investment boost for Jharkhand as it partners with Tata Steel for green technologies.",
            body: "In a significant development at the World Economic Forum in Davos, the Jharkhand government has signed a Memorandum of Understanding (MoU) with Tata Steel worth over ₹11,000 crore.\n\nThe investment will be directed towards establishing advanced green steel manufacturing technologies in the state, boosting both industrial growth and sustainability efforts.",
            image: "https://placehold.co/800x450/2a9d8f/ffffff?text=Tata+Steel+MoU",
            tags: ["Investment", "Davos", "Industry"]
        },
        {
            headline: "Global Markets Jittery Over New Tariff Threats",
            summary: "Wall Street and European markets react negatively to prospects of renewed trade barriers.",
            body: "Global equity markets have shown signs of nervousness, with Wall Street experiencing its worst day in months. The sell-off was triggered by renewed threats of tariffs from the US specifically targeting European goods.\n\nInvestors fear that a return to protectionist trade policies could stifle global economic growth just as it was beginning to stabilize post-pandemic.",
            image: "https://placehold.co/800x450/1d3557/ffffff?text=Global+Markets",
            tags: ["Global Economy", "Trade", "Markets"]
        }
    ],
    'Tech': [
        {
            headline: "OpenAI Introduces Age Prediction to Safer ChatGPT",
            summary: "New safety measures aim to protect teen users by accurately predicting age.",
            body: "OpenAI has rolled out a new age prediction system for its ChatGPT platform. The tool is designed to identify users who may be minors to apply appropriate safety filters and content restrictions.\n\nThis move comes amidst growing scrutiny from regulators and parents regarding the safety of AI platforms for younger audiences.",
            image: "https://placehold.co/1200x500/000000/ffffff?text=OpenAI+Safety",
            tags: ["AI", "ChatGPT", "Safety"]
        },
        {
            headline: "Realme Teases P4 Power with Massive 10,000mAh Battery",
            summary: "Battery anxiety might be a thing of the past with Realme's upcoming power-centric phone.",
            body: "Smartphone brand Realme is set to launch the 'P4 Power', a device that stands out for its colossal 10,001mAh battery. Leaks suggest the phone is designed for power users and travelers who need multi-day battery life.\n\nWhile the device may be bulkier than standard flagships, the promise of such endurance has generated significant buzz in the tech community.",
            image: "https://placehold.co/1200x500/3a0ca3/ffffff?text=Realme+10000mAh",
            tags: ["Mobile", "Smartphones", "Hardware"]
        },
        {
            headline: "Strongest Solar Storm in 20 Years Hits Earth",
            summary: "Radiation storm sparks rare aurorae and raises concerns for satellite operations.",
            body: "Earth has just been impacted by the strongest solar radiation storm seen in over two decades. The event has triggered spectacular aurora displays at much lower latitudes than usual.\n\nHowever, space weather experts are monitoring the situation closely for potential disruptions to GPS signals, radio communications, and satellite grid operations.",
            image: "https://placehold.co/1200x500/f72585/ffffff?text=Solar+Storm",
            tags: ["Space", "Science", "Astronomy"]
        },
        {
            headline: "GPU Prices Surge Again as AI Demand Outstrips Supply",
            summary: "Gamers face shortages as Nvidia cards become scarce and expensive.",
            body: "The graphics card market is facing another crisis. Prices for high-end GPUs have spiked significantly, with many popular models completely out of stock.\n\nAnalysts point to the insatiable demand from AI companies building data centers as the primary driver, leaving PC gamers and hobbyists with few affordable options.",
            image: "https://placehold.co/1200x500/4cc9f0/000000?text=GPU+Shortage",
            tags: ["Hardware", "Gaming", "AI"]
        },
        {
            headline: "OpenAI Teases First Hardware Product Launch",
            summary: "Sam Altman's company may soon enter the physical device market.",
            body: "In a surprising development, rumors are swirling that OpenAI is preparing to launch its first-ever hardware product later this year. While details are scarce, speculation ranges from a dedicated AI assistant device to smart glasses.\n\nThis would mark a major shift for the company, moving it from a pure software provider to a direct consumer electronics competitor.",
            image: "https://placehold.co/1200x500/10002b/ffffff?text=OpenAI+Hardware",
            tags: ["AI", "Hardware", "Innovation"]
        }
    ],
    'Sports': [
        {
            headline: "Bangladesh - PCB Stand United on T20 World Cup Standoff",
            summary: "The Bangladesh Cricket Board faces a deadline but finds support from Pakistan against ICC conditions.",
            body: "The standoff over the T20 World Cup 2026 participation continues. The Bangladesh Cricket Board (BCB) is reportedly holding firm against conditions set by the ICC, finding an ally in the Pakistan Cricket Board (PCB).\n\nWith the deadline approaching, the cricketing world waits to see if a compromise can be reached or if the tournament will proceed without one of its key Asian teams.",
            image: "https://placehold.co/1200x675/1e6091/ffffff?text=Cricket+Standoff",
            tags: ["Cricket", "T20 World Cup", "BCB"]
        },
        {
            headline: "Mbappe & Vinicius Jr Shine in Real Madrid's 6-1 Thrashing",
            summary: "Los Blancos dominate Monaco in the Champions League with star forwards leading the charge.",
            body: "Real Madrid reminded the world of their European pedigree with a crushing 6-1 victory over Monaco. Kylian Mbappe and Vinicius Jr. were in sublime form, tearing apart the opposition defense.\n\nThe victory serves as a strong statement to rivals and eases recent pressure on the club management.",
            image: "https://placehold.co/1200x675/ffffff/000000?text=Real+Madrid+Win",
            tags: ["Football", "Champions League", "Real Madrid"]
        },
        {
            headline: "India Eyes T20 Series Win Against New Zealand",
            summary: "Suryakumar Yadav's form in focus as Men in Blue prepare for crucial series.",
            body: "Team India is all set to face New Zealand in the upcoming T20I series. All eyes are on captain Suryakumar Yadav, whose aggressive batting will be key to India's chances.\n\nThe series also marks the return of Ishan Kishan, giving the management a chance to test their squad depth ahead of the World Cup.",
            image: "https://placehold.co/1200x675/0077b6/ffffff?text=India+vs+NZ",
            tags: ["Cricket", "Team India", "T20"]
        },
        {
            headline: "PSG Stunned by Sporting Lisbon in Champions League",
            summary: "Luis Suarez's late header condemns Parisians to a 2-1 defeat.",
            body: "Paris Saint-Germain suffered a major setback in their Champions League campaign, losing 2-1 to Sporting Lisbon. A late header by veteran Luis Suarez sealed the fate of the Parisians.\n\nThe defeat complicates PSG's path to the knockout stages and puts the spotlight back on their defensive frailties.",
            image: "https://placehold.co/1200x675/03045e/ffffff?text=PSG+Defeat",
            tags: ["Football", "PSG", "Champions League"]
        },
        {
            headline: "Senegal Erupts in Joy After Historic AFCON Victory",
            summary: "Parades and presidential praise follow the national team's triumph.",
            body: "Senegal is in party mode following their historic victory in the Africa Cup of Nations (AFCON). Thousands lined the streets of Dakar to welcome the heroes home.\n\nThe President has declared a national holiday to celebrate the achievement, hailing the team's resilience and skill.",
            image: "https://placehold.co/1200x675/007f5f/ffffff?text=Senegal+Champions",
            tags: ["Football", "AFCON", "Senegal"]
        }
    ],
    'Entertainment': [
        {
            headline: "Box Office: 'Dhurandhar' Crosses ₹1200 Cr Worldwide",
            summary: "Ranveer Singh's spy thriller continues to shatter records globally.",
            body: "The box office run of 'Dhurandhar' shows no signs of slowing down. The Ranveer Singh and Akshaye Khanna starrer has now crossed the monumental ₹1,275 crore mark globally.\n\nTrade analysts call it a 'historic blockuster', noting its exceptional hold in theaters even weeks after release.",
            image: "https://placehold.co/800x600/9d0208/ffffff?text=Dhurandhar+Hit",
            tags: ["Bollywood", "Box Office", "Movies"]
        },
        {
            headline: "Golden Globes 2026: 'One Battle After Another' Wins Big",
            summary: "Paul Thomas Anderson's film sweeps major categories including Best Picture.",
            body: "The 2026 Golden Globe Awards belonged to Paul Thomas Anderson's war drama 'One Battle After Another'. The film took home four awards, including Best Motion Picture (Comedy/Musical).\n\nChloé Zhao's 'Hamnet' also had a strong showing, winning Best Drama, signaling a competitive awards season ahead.",
            image: "https://placehold.co/800x600/ffba08/000000?text=Golden+Globes",
            tags: ["Hollywood", "Awards", "Golden Globes"]
        },
        {
            headline: "Nupur Sanon Ties the Knot in Private Ceremony",
            summary: "Kriti Sanon's sister gets married; fans flood social media with wishes.",
            body: "Nupur Sanon has begun a new chapter in her life. The singer and actress tied the knot in a private, intimate ceremony attended by close family and friends.\n\nSister Kriti Sanon shared heartwarming pictures from the wedding, which quickly went viral on social media.",
            image: "https://placehold.co/800x600/fb6f92/ffffff?text=Nupur+Sanon+Wedding",
            tags: ["Bollywood", "Celebrity", "Wedding"]
        },
        {
            headline: "Lucasfilm Shakeup: Kathleen Kennedy Steps Down",
            summary: "End of an era as Dave Filoni takes charge of the Star Wars universe.",
            body: "In a massive industry shakeup, Kathleen Kennedy is stepping down as head of Lucasfilm after 14 years. She will be succeeded by Dave Filoni, the creative force behind 'The Mandalorian' and 'Clone Wars'.\n\nFans have largely welcomed the move, hoping for a unified creative vision for the future of the Star Wars franchise.",
            image: "https://placehold.co/800x600/000000/ffe81f?text=Lucasfilm+News",
            tags: ["Hollywood", "Star Wars", "Industry"]
        },
        {
            headline: "Netflix Leading Bidder for Warner Bros. Discovery Assets",
            summary: "Streaming giant eyes HBO and DC Studios in potential mega-deal.",
            body: "Reports indicate that Netflix is currently the frontrunner to acquire significant assets from Warner Bros. Discovery. The potential deal could include HBO, DC Studios, and the legendary Warner Bros. film library.\n\nIf completed, this acquisition would fundamentally reshape the media landscape and solidify Netflix's dominance in streaming.",
            image: "https://placehold.co/800x600/e50914/ffffff?text=Netflix+Deal",
            tags: ["Streaming", "Business", "Hollywood"]
        }
    ]
};

// Map layout keys to content keys for each category
const getElementContent = (category, data) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const author = "Digital Jagaran Desk";

    switch (category) {
        case 'Politics':
            return {
                'pol-header': data.headline,
                'pol-meta': `By ${author} | ${today}`,
                'pol-image': data.image,
                'pol-summary': data.summary,
                'pol-body': data.body
            };
        case 'Business':
            return {
                'bus-header': data.headline,
                'bus-image': data.image,
                'bus-summary': data.summary,
                'bus-body': data.body
            };
        case 'Tech':
            return {
                'tech-header': data.headline,
                'tech-image': data.image,
                'tech-meta': `By ${author} • ${today}`,
                'tech-tags': data.tags.join(' • '),
                'tech-summary': data.summary,
                'tech-body': data.body
            };
        case 'Sports':
            return {
                'sport-header': data.headline,
                'sport-image': data.image,
                'sport-summary': data.summary,
                'sport-body': data.body
            };
        case 'Entertainment':
            return {
                'ent-header': data.headline,
                'ent-image': data.image,
                'ent-summary': data.summary,
                'ent-body': data.body
            };
        default:
            return {};
    }
};

const seedArticles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Article Seeding');

        // Fetch layouts
        const layouts = {};
        const categories = ['Politics', 'Business', 'Tech', 'Sports', 'Entertainment'];

        for (const cat of categories) {
            const template = await LayoutTemplate.findOne({ name: `Default - ${cat}` });
            if (!template) {
                console.error(`Layout template 'Default - ${cat}' not found. Run 'npm run seed:layouts' first.`);
                process.exit(1);
            }
            layouts[cat] = template._id;
        }

        let createdCount = 0;

        for (const [category, articles] of Object.entries(articlesData)) {
            const layoutId = layouts[category];

            for (const item of articles) {
                // Check if article already exists (simple duplicate check by headline)
                const exists = await Article.findOne({ article_header_en: item.headline });
                if (exists) {
                    console.log(`Skipping existing article: ${item.headline}`);
                    continue;
                }

                const elementContent = getElementContent(category, item);

                const newArticle = new Article({
                    published_language: 'en',
                    is_Published: false,
                    is_Drafted: true,
                    article_header_en: item.headline,
                    summary_en: item.summary,
                    body_en: item.body,
                    photos: [item.image],
                    tags_en: item.tags,
                    author: "Digital Jagaran Desk",
                    layoutTemplate: layoutId,
                    elementContent_en: elementContent,
                    // English content set as primary for "en" draft
                    article_header: item.headline,
                    summary: item.summary,
                    body: item.body
                });

                await newArticle.save();
                console.log(`Created article: ${item.headline} (${category})`);
                createdCount++;
            }
        }

        console.log(`\nSeeding complete. Created ${createdCount} new articles.`);
        process.exit(0);

    } catch (error) {
        console.error('Article Seeding Error:', error);
        process.exit(1);
    }
};

seedArticles();
