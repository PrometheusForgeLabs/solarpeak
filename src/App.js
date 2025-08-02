import React, { useState, useRef } from 'react';
import { Sun, MapPin, Loader2, AlertCircle, BarChart, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- UI Components (Styled with Tailwind CSS) ---
// These components mimic the style of shadcn/ui for a clean look.

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children, className = '' }) => <div className={`p-6 ${className}`}>{children}</div>;
const CardContent = ({ children, className = '' }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{children}</label>;

const Input = (props) => (
    <input
        {...props}
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
    />
);

const Button = ({ children, ...props }) => (
    <button
        {...props}
        className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-gray-400 disabled:cursor-not-allowed ${props.className}`}
    >
        {children}
    </button>
);

const Alert = ({ children, variant = 'default' }) => {
    const colors = variant === 'destructive'
        ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
        : 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-700 dark:text-yellow-300';
    return (
        <div className={`border-l-4 p-4 rounded-md ${colors}`} role="alert">
            <div className="flex">
                <div className="py-1"><AlertCircle className="h-5 w-5" /></div>
                <div className="ml-3">
                    <p className="text-sm">{children}</p>
                </div>
            </div>
        </div>
    );
};

const Table = ({ children, className = '' }) => <table className={`w-full text-sm text-left text-gray-500 dark:text-gray-400 ${className}`}>{children}</table>;
const TableHeader = ({ children }) => <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">{children}</thead>;
const TableRow = ({ children }) => <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">{children}</tr>;
const TableHead = ({ children }) => <th scope="col" className="px-6 py-3">{children}</th>;
const TableBody = ({ children }) => <tbody>{children}</tbody>;
const TableCell = ({ children, className = '' }) => <td className={`px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap ${className}`}>{children}</td>;


// --- Main App Component ---
function App() {
    const [latitude, setLatitude] = useState('1.3733'); // Default to Kampala, Uganda
    const [longitude, setLongitude] = useState('32.2903');
    const [tilt, setTilt] = useState('10');
    const [azimuth, setAzimuth] = useState('0');
    const [results, setResults] = useState(null);
    const [totals, setTotals] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const resultsRef = useRef();

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            setIsLoading(true);
            setError('');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude.toFixed(4));
                    setLongitude(position.coords.longitude.toFixed(4));
                    setIsLoading(false);
                },
                (err) => {
                    setError(`Geolocation error: ${err.message}`);
                    setIsLoading(false);
                }
            );
        } else {
            setError("Geolocation is not supported by this browser.");
        }
    };

    const handleCalculate = async () => {
        if (!latitude || !longitude) {
            setError("Latitude and Longitude are required.");
            return;
        }
        setIsLoading(true);
        setError('');
        setResults(null);
        setTotals(null);
        
        // Use a relative URL. The Create React App proxy will forward this to the correct server.
        const apiUrl = `/api/v5_2/PVcalc?lat=${latitude}&lon=${longitude}&peakpower=1&loss=14&angle=${tilt || 0}&aspect=${azimuth || 0}&outputformat=json`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API request failed with status ${response.status}`);
            }
            const data = await response.json();
            setResults(data.outputs.monthly.fixed);
            setTotals(data.outputs.totals.fixed);
        } catch (err) {
            setError(`Failed to fetch data: ${err.message}. Please check your inputs and try again.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!results || !totals) {
            return;
        }

        const doc = new jsPDF();

        // Add monthly data
        doc.setFontSize(16);
        doc.text('Monthly Average Peak Sun Hours (kWh/m²/day)', 14, 22);
        autoTable(doc, {
            startY: 30,
            head: [['Month', 'Energy (E_d)', 'Irradiation (H(i)_d)']],
            body: results.map((monthData, index) => [
                monthNames[index],
                monthData.E_d.toFixed(2),
                monthData['H(i)_d'].toFixed(2),
            ]),
        });

        // Add yearly data
        let finalY = doc.lastAutoTable.finalY || 30;
        doc.setFontSize(16);
        doc.text('Yearly Summary', 14, finalY + 15);
        autoTable(doc, {
            startY: finalY + 23,
            head: [['Description', 'Energy (E_y)', 'Irradiation (H(i)_y)']],
            body: [
                ['Total', totals.E_y.toFixed(2), totals['H(i)_y'].toFixed(2)],
            ],
        });

        doc.save('solar-report.pdf');
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <Sun className="h-8 w-8 text-sky-500" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solar Peak Sun Hours</h1>
                            <p className="text-gray-500 dark:text-gray-400">Calculate the daily average for any location.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <Label htmlFor="latitude">Latitude</Label>
                            <Input id="latitude" type="number" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="e.g., 1.3733" />
                        </div>
                        <div>
                            <Label htmlFor="longitude">Longitude</Label>
                            <Input id="longitude" type="number" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="e.g., 32.2903" />
                        </div>
                        <div>
                            <Label htmlFor="tilt">Panel Tilt (°)</Label>
                            <Input id="tilt" type="number" value={tilt} onChange={e => setTilt(e.target.value)} placeholder="e.g., 10" />
                        </div>
                        <div>
                            <Label htmlFor="azimuth">Panel Azimuth (°)</Label>
                            <Input id="azimuth" type="number" value={azimuth} onChange={e => setAzimuth(e.target.value)} placeholder="e.g., 0 (North)" />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <Button onClick={handleGetLocation} className="w-full bg-gray-700 hover:bg-gray-800" disabled={isLoading}>
                            <MapPin className="mr-2 h-4 w-4" /> Use My Location
                        </Button>
                        <Button onClick={handleCalculate} className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart className="mr-2 h-4 w-4" />}
                            Calculate
                        </Button>
                    </div>

                    {error && <Alert variant="destructive">{error}</Alert>}

                    <div ref={resultsRef}>
                        {results && (
                            <div className="mt-6">
                                <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Monthly Average Peak Sun Hours (kWh/m²/day)</h2>
                                <div className="rounded-lg border dark:border-gray-700 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Month</TableHead>
                                                <TableHead>Energy (E_d)</TableHead>
                                                <TableHead>Irradiation (H(i)_d)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.map((monthData, index) => (
                                                <TableRow key={monthData.month}>
                                                    <TableCell>{monthNames[index]}</TableCell>
                                                    <TableCell>{monthData.E_d.toFixed(2)}</TableCell>
                                                    <TableCell>{monthData['H(i)_d'].toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {totals && (
                            <div className="mt-6">
                                <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Yearly Summary</h2>
                                <div className="rounded-lg border dark:border-gray-700 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Energy (E_y)</TableHead>
                                                <TableHead>Irradiation (H(i)_y)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Total</TableCell>
                                                <TableCell>{totals.E_y.toFixed(2)}</TableCell>
                                                <TableCell>{totals['H(i)_y'].toFixed(2)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>

                    {results && (
                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleDownloadPdf} className="bg-green-600 hover:bg-green-700">
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default App;
