const mongoose = require('mongoose');
const LayoutTemplate = require('./models/LayoutTemplate');
require('dotenv').config();

const layouts = [
    {
        name: 'Default - Politics',
        description: 'A serious, authoritative layout for political news, prioritizing clear headlines and readable text.',
        isDefault: false,
        theme: {
            backgroundColor: '#ffffff',
            textColor: '#1a1a1a',
            accentColor: '#dc2626' // Red 600
        },
        elements: [
            // Row 0: Header (Full Width)
            {
                id: 'pol-header',
                type: 'header',
                row: 0,
                column: 0,
                width: 12,
                config: {
                    fontSize: '4xl',
                    fontWeight: 'bold',
                    fontFamily: 'serif',
                    marginBottom: '4'
                }
            },
            // Row 1: Metadata (Author/Date)
            {
                id: 'pol-meta',
                type: 'author', // using author/date combined usually, or separate
                row: 1,
                column: 0,
                width: 12,
                config: {
                    fontSize: 'sm',
                    textColor: 'gray-600',
                    marginBottom: '6'
                }
            },
            // Row 2: Main Image (Full Width)
            {
                id: 'pol-image',
                type: 'image',
                row: 2,
                column: 0,
                width: 12,
                config: {
                    aspectRatio: '21/9',
                    borderRadius: 'md',
                    marginBottom: '6'
                }
            },
            // Row 3: Summary (Highlighted)
            {
                id: 'pol-summary',
                type: 'summary',
                row: 3,
                column: 0,
                width: 12,
                config: {
                    fontSize: 'xl',
                    fontWeight: 'medium',
                    fontFamily: 'serif',
                    lineHeight: 'relaxed',
                    paddingLeft: '4',
                    borderColor: 'gray-300',
                    borderWidth: '0 0 0 4px', // Left border
                    marginBottom: '8',
                    textColor: 'gray-800'
                }
            },
            // Row 4: Body
            {
                id: 'pol-body',
                type: 'body',
                row: 4,
                column: 0,
                width: 12,
                config: {
                    fontSize: 'lg',
                    lineHeight: 'loose',
                    fontFamily: 'serif'
                }
            }
        ]
    },
    {
        name: 'Default - Business',
        description: 'Clean, professional layout for business and finance, structured for data and clarity.',
        isDefault: false,
        theme: {
            backgroundColor: '#f8fafc', // Slate 50
            textColor: '#0f172a', // Slate 900
            accentColor: '#0f766e' // Teal 700
        },
        elements: [
            // Row 0: Header
            {
                id: 'bus-header',
                type: 'header',
                row: 0,
                column: 0,
                width: 12,
                config: {
                    fontSize: '3xl',
                    fontWeight: 'bold',
                    fontFamily: 'sans',
                    marginBottom: '2'
                }
            },
            // Row 1: Divider
            {
                id: 'bus-div-1',
                type: 'divider',
                row: 1,
                column: 0,
                width: 12,
                config: { marginBottom: '6' }
            },
            // Row 2: Main Image (Left) & Summary (Right) - Split Layout
            {
                id: 'bus-image',
                type: 'image',
                row: 2,
                column: 0,
                width: 7, // Wider image
                config: {
                    aspectRatio: '16/9',
                    borderRadius: 'none'
                }
            },
            {
                id: 'bus-summary',
                type: 'summary',
                row: 2,
                column: 7,
                width: 5,
                config: {
                    fontSize: 'lg',
                    backgroundColor: 'white',
                    paddingTop: '6',
                    paddingBottom: '6',
                    paddingLeft: '6',
                    paddingRight: '6',
                    borderRadius: 'none',
                    textColor: 'gray-700'
                }
            },
            // Row 3: Spacer
            {
                id: 'bus-spacer',
                type: 'spacer',
                row: 3,
                column: 0,
                width: 12,
                config: { marginBottom: '8' }
            },
            // Row 4: Body
            {
                id: 'bus-body',
                type: 'body',
                row: 4,
                column: 0,
                width: 12, // Centered body? Maybe limited max-width in container
                config: {
                    fontFamily: 'sans',
                    fontSize: 'base',
                    lineHeight: 'relaxed'
                }
            }
        ]
    },
    {
        name: 'Default - Tech',
        description: 'Modern, sleek layout for technology news, featuring dark accents and monospaced elements.',
        isDefault: false,
        theme: {
            backgroundColor: '#ffffff',
            textColor: '#111827', // Gray 900
            accentColor: '#3b82f6' // Blue 500
        },
        elements: [
            // Row 0: Header
            {
                id: 'tech-header',
                type: 'header',
                row: 0,
                column: 0,
                width: 12,
                config: {
                    fontSize: '5xl',
                    fontWeight: 'black',
                    fontFamily: 'sans', // Modern
                    textAlign: 'center',
                    marginBottom: '8'
                }
            },
            // Row 1: Main Image (Wide)
            {
                id: 'tech-image',
                type: 'image',
                row: 1,
                column: 0,
                width: 12,
                config: {
                    aspectRatio: '21/9',
                    borderRadius: 'xl',
                    marginBottom: '8'
                }
            },
            // Row 2: Metadata + Tags (Grid)
            {
                id: 'tech-meta',
                type: 'author',
                row: 2,
                column: 0,
                width: 6,
                config: { marginBottom: '4' }
            },
            {
                id: 'tech-tags',
                type: 'tags',
                row: 2,
                column: 6,
                width: 6,
                config: {
                    textAlign: 'right',
                    marginBottom: '4'
                }
            },
            // Row 3: Summary (Code-like block)
            {
                id: 'tech-summary',
                type: 'summary',
                row: 3,
                column: 0,
                width: 12,
                config: {
                    fontFamily: 'sans',
                    fontSize: 'lg',
                    backgroundColor: '#f3f4f6', // Gray 100
                    paddingTop: '4',
                    paddingBottom: '4',
                    paddingLeft: '4',
                    paddingRight: '4',
                    borderRadius: 'lg',
                    marginBottom: '8'
                }
            },
            // Row 4: Body
            {
                id: 'tech-body',
                type: 'body',
                row: 4,
                column: 0,
                width: 12,
                config: {
                    fontFamily: 'sans',
                    fontSize: 'base',
                    lineHeight: 'relaxed'
                }
            }
        ]
    },
    {
        name: 'Default - Sports',
        description: 'High-energy layout for sports, prioritizing large visuals and bold impact.',
        isDefault: false,
        theme: {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            accentColor: '#ef4444' // Red 500
        },
        elements: [
            // Row 0: Main Image (Top - Hero Style)
            {
                id: 'sport-image',
                type: 'image',
                row: 0,
                column: 0,
                width: 12,
                config: {
                    aspectRatio: '16/9',
                    borderRadius: 'none',
                    marginBottom: '6'
                }
            },
            // Row 1: Header (Overlapping or right below, extremely bold)
            {
                id: 'sport-header',
                type: 'header',
                row: 1,
                column: 0,
                width: 12,
                config: {
                    fontSize: '6xl', // Massive
                    fontWeight: 'black',
                    fontFamily: 'sans',
                    textAlign: 'left',
                    lineHeight: 'tight',
                    marginBottom: '4'
                }
            },
            // Row 2: Summary (Lead)
            {
                id: 'sport-summary',
                type: 'summary',
                row: 2,
                column: 0,
                width: 12,
                config: {
                    fontSize: '2xl',
                    fontWeight: 'bold',
                    textColor: 'gray-500',
                    marginBottom: '8'
                }
            },
            // Row 3: Body, bold start
            {
                id: 'sport-body',
                type: 'body',
                row: 3,
                column: 0,
                width: 12,
                config: {
                    fontFamily: 'sans',
                    fontSize: 'lg'
                }
            }
        ]
    },
    {
        name: 'Default - Entertainment',
        description: 'Visual-first, magazine-style layout for entertainment and lifestyle news.',
        isDefault: false,
        theme: {
            backgroundColor: '#fff1f2', // Rose 50
            textColor: '#881337', // Rose 900
            accentColor: '#e11d48' // Rose 600
        },
        elements: [
            // Row 0: Header (Center, Stylish)
            {
                id: 'ent-header',
                type: 'header',
                row: 0,
                column: 0,
                width: 12,
                config: {
                    fontSize: '4xl',
                    fontWeight: 'semibold',
                    fontFamily: 'serif',
                    textAlign: 'center',
                    textColor: '#9d174d', // Pink 800
                    marginBottom: '6'
                }
            },
            // Row 1: Main Image (Portrait or Landscape, Stylish borders)
            {
                id: 'ent-image',
                type: 'image',
                row: 1,
                column: 0,
                width: 12,
                config: {
                    aspectRatio: '4/3',
                    borderRadius: '3xl', // Highly rounded
                    marginBottom: '8'
                }
            },
            // Row 2: Summary (Italicized, centered)
            {
                id: 'ent-summary',
                type: 'summary',
                row: 2,
                column: 1, // Offset
                width: 10, // Narrower
                config: {
                    fontSize: 'xl',
                    fontWeight: 'normal',
                    fontFamily: 'serif', // Italic if supported or style via fonts
                    textAlign: 'center',
                    marginBottom: '8'
                }
            },
            // Row 3: Divider
            {
                id: 'ent-div',
                type: 'divider',
                row: 3,
                column: 2,
                width: 8,
                config: {
                    marginBottom: '8',
                    borderColor: '#f472b6' // Pink 400
                }
            },
            // Row 4: Body
            {
                id: 'ent-body',
                type: 'body',
                row: 4,
                column: 0,
                width: 12,
                config: {
                    fontFamily: 'serif',
                    fontSize: 'lg',
                    lineHeight: 'loose'
                }
            }
        ]
    }
];

const seedLayouts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Seeding');

        for (const layout of layouts) {
            await LayoutTemplate.findOneAndUpdate(
                { name: layout.name },
                layout,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`Seeded layout: ${layout.name}`);
        }

        console.log('All layouts seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedLayouts();
