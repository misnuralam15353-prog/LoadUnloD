
import React, { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ReportType, StaffInfo, StaffMember } from './types';
import EditableField from './components/EditableField';

// Predefined list of staff members
const staffList: StaffMember[] = [
  { id: 'R000249325', name: 'Md. Toriqul Islam', title: 'Jex (Shipping)', phone: '01898775691' },
  { id: 'R000221173', name: 'Md. Sajib Hossain', title: 'Jex (Shipping)', phone: '01898775688' },
  { id: 'R000226740', name: 'F. M Asad', title: 'Shipping Assistant', phone: '01898775689' },
  { id: 'R000248716', name: 'Morol Tarikul Islam', title: 'Shipping Assistant', phone: '01898775690' },
  { id: 'R000800482', name: 'Abdulla Al Mamun', title: 'Shipping Assistant', phone: '01844665855' },
  { id: 'R000217176', name: 'Tarek', title: 'Shipping Assistant', phone: '01898775687' },
  { id: '190190', name: 'Md. Shourab Hossain', title: 'Jex (Store)', phone: '01898775926' },
  { id: 'S178390', name: 'Kamolesh Pal', title: 'Shipping Assistant', phone: '01844200189' },
];

// Helper to format date to YYYY-MM-DD for the input[type=date] value
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format date from YYYY-MM-DD to DD/MM/YYYY for display
const formatDateForDisplay = (dateString: string): string => {
  if (!dateString || !dateString.includes('-')) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};


const App: React.FC = () => {
  const [reportDate, setReportDate] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>(ReportType.Unload);
  const [vehicles, setVehicles] = useState<string[]>(['6115', '3925', '6128', '3167']);
  const [vehicleInput, setVehicleInput] = useState<string>('');
  const [staffInfo, setStaffInfo] = useState<StaffInfo>({
    id: staffList[0].id,
    name: `${staffList[0].name} | ${staffList[0].title}`,
    phone: staffList[0].phone,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [isAiNoteSectionOpen, setIsAiNoteSectionOpen] = useState(false);


  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setReportDate(formatDateForInput(yesterday));
  }, []);

  const handleStaffInfoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStaffInfo(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleStaffSelectionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedStaff = staffList.find(staff => staff.id === selectedId);
    if (selectedStaff) {
      setStaffInfo({
        id: selectedStaff.id,
        name: `${selectedStaff.name} | ${selectedStaff.title}`,
        phone: selectedStaff.phone,
      });
    }
  }, []);

  const handleAddVehicle = (e: FormEvent) => {
    e.preventDefault();
    if (vehicleInput.trim() && !vehicles.includes(vehicleInput.trim())) {
      setVehicles(prev => [...prev, vehicleInput.trim()]);
      setVehicleInput('');
    }
  };

  const handleRemoveVehicle = (indexToRemove: number) => {
    setVehicles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleEditStart = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleEditSave = (indexToUpdate: number) => {
    const trimmedValue = editingValue.trim();
    if (!trimmedValue) {
      alert("Vehicle number cannot be empty.");
      return;
    }
    if (vehicles.some((v, i) => v === trimmedValue && i !== indexToUpdate)) {
      alert("This vehicle number already exists.");
      return;
    }
    const updatedVehicles = [...vehicles];
    updatedVehicles[indexToUpdate] = trimmedValue;
    setVehicles(updatedVehicles);
    handleEditCancel();
  };

  const filteredVehicles = useMemo(() => 
    vehicles
      .map((vehicle, index) => ({ vehicle, originalIndex: index }))
      .filter(({ vehicle }) => vehicle.toLowerCase().includes(searchQuery.toLowerCase())),
    [vehicles, searchQuery]
  );

  const generateReportText = useCallback((): string => {
    const vehicleList = vehicles.map((v, i) => `${i + 1}) ${v}`).join('\n');
    const displayDate = formatDateForDisplay(reportDate);
    const noteSection = aiNote.trim() ? `\n*Note:* ${aiNote.trim()}\n` : '';

    return `*RFL DISTRIBUTION*
KHULNA DEPOT - 16531
Damudor, Phultala, Khulna
-------------------------
*Vehicle ${reportType} Report*
*Date:* ${displayDate}

*Vehicles (${vehicles.length} total):*
${vehicleList.length > 0 ? vehicleList : 'No vehicles listed.'}${noteSection}

*Total:* ${vehicles.length} No's Vehicles ${reportType}
-------------------------
*Staff Details:*
*Staff ID:* ${staffInfo.id}
*Name:* ${staffInfo.name}
*Phone:* ${staffInfo.phone}
`;
  }, [vehicles, reportType, staffInfo, reportDate, aiNote]);

  const handleGenerateNote = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingNote(true);
    setAiNote('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const displayDate = formatDateForDisplay(reportDate);
      const fullPrompt = `You are an assistant for a logistics depot manager. Based on the following report details, write a brief, professional note of one or two sentences.
- Report Type: ${reportType}
- Date: ${displayDate}
- Total Vehicles: ${vehicles.length}
- User's instruction: "${aiPrompt}"

Generate only the note text.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      setAiNote(response.text);
    } catch (error) {
      console.error("Error generating AI note:", error);
      alert("Failed to generate AI note. Please check your connection and try again.");
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleViewReport = () => {
    setReportText(generateReportText());
    setIsModalOpen(true);
  };

  const handleSaveReport = async () => {
    const textToCopy = generateReportText();
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert('Report copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('Error: Could not copy report to clipboard.');
    }
  };

  const handleShare = () => {
    const whatsappGroupUrl = 'https://chat.whatsapp.com/IAVa9xO8XHW2LdMphVkpL7';
    window.open(whatsappGroupUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    const apkUrl = 'https://github.com/toriqul-ISL/rfl-unload-reporter/releases/download/v1.1.0/RFL.Khulna.Depot.Unload.Reporter.apk';
    window.open(apkUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="min-h-screen p-2 sm:p-4">
        <div className="w-full max-w-md mx-auto bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
          
          <header className="text-center relative">
            <h1 className="text-xl font-bold text-white">RFL DISTRIBUTION</h1>
            <p className="text-sm text-gray-300">KHULNA DEPOT - 16531</p>
            <p className="text-xs text-gray-400">Damudor, Phultala, Khulna</p>
            <button 
              onClick={handleDownload} 
              className="absolute top-0 right-0 text-orange-400 hover:text-orange-300 transition-colors p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 dark:focus:ring-offset-gray-800" 
              aria-label="Download Android App"
            >
              <i className="fab fa-android text-2xl"></i>
            </button>
          </header>

          <div className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
            <strong className="mr-2">Date:</strong>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full bg-transparent p-0 border-none text-gray-100 placeholder-gray-400 focus:ring-0 sm:text-sm"
              aria-label="Report Date"
            />
          </div>

          <main className="space-y-4">
            <h2 className="text-center font-semibold text-gray-200 border-b pb-2 border-gray-700">
              Vehicle Load/Unload Report
            </h2>

            <div>
              <label htmlFor="reportType" className="sr-only">Report Type</label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={ReportType.Load}>Load</option>
                <option value={ReportType.Unload}>Unload</option>
              </select>
            </div>

            <form onSubmit={handleAddVehicle} className="flex space-x-2">
              <input
                type="text"
                value={vehicleInput}
                onChange={(e) => setVehicleInput(e.target.value)}
                placeholder="Enter Vehicle No."
                className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              >
                <i className="fas fa-plus"></i>
              </button>
            </form>

            <div className="space-y-2">
               <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Vehicles..."
                  className="w-full bg-gray-700/80 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="border border-gray-700 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {filteredVehicles.length > 0 ? (
                  <ol className="list-decimal list-inside text-gray-200 space-y-2">
                    {filteredVehicles.map(({ vehicle, originalIndex }) => (
                      <li key={originalIndex} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                        {editingIndex === originalIndex ? (
                          <>
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleEditSave(originalIndex)}
                              className="flex-grow bg-gray-900 border border-indigo-500 rounded px-2 py-1 text-white"
                              autoFocus
                            />
                            <div className="flex items-center ml-2 space-x-2">
                              <button onClick={() => handleEditSave(originalIndex)} className="text-green-500 hover:text-green-400" aria-label="Save changes"><i className="fas fa-check"></i></button>
                              <button onClick={handleEditCancel} className="text-gray-500 hover:text-gray-400" aria-label="Cancel edit"><i className="fas fa-times"></i></button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span>{vehicle}</span>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleEditStart(originalIndex, vehicle)} className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded" aria-label={`Edit vehicle ${vehicle}`}>
                                <i className="fas fa-pencil-alt"></i>
                                </button>
                                <button onClick={() => handleRemoveVehicle(originalIndex)} className="text-red-500 hover:text-red-400 text-sm px-2 py-1 rounded" aria-label={`Remove vehicle ${vehicle}`}>
                                <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-center text-gray-400 text-sm">
                    {vehicles.length > 0 ? 'No vehicles match your search.' : 'No vehicles added.'}
                  </p>
                )}
              </div>
            </div>

            <div className="border border-gray-700 rounded-lg">
              <button
                onClick={() => setIsAiNoteSectionOpen(!isAiNoteSectionOpen)}
                className="w-full flex justify-between items-center p-3 text-left text-gray-200"
                aria-expanded={isAiNoteSectionOpen}
              >
                <span className="font-semibold">Optional: AI-Generated Note</span>
                <i className={`fas fa-chevron-down transition-transform ${isAiNoteSectionOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {isAiNoteSectionOpen && (
                <div className="p-3 border-t border-gray-700 space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., 'heavy rain delay'"
                      className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isGeneratingNote}
                    />
                    <button
                      onClick={handleGenerateNote}
                      disabled={isGeneratingNote || !aiPrompt.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800"
                      aria-label="Generate AI Note"
                    >
                      {isGeneratingNote ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-magic"></i>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={aiNote}
                    onChange={(e) => setAiNote(e.target.value)}
                    placeholder="AI-generated note will appear here..."
                    className="w-full bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
                    aria-label="AI Generated Note"
                  />
                </div>
              )}
            </div>

            <div className="text-center font-semibold text-indigo-400 bg-indigo-900/50 p-3 rounded-lg">
              = {vehicles.length} No's Vehicles {reportType}
            </div>
          </main>
          
          <hr className="border-gray-700" />
          
          <footer className="space-y-3">
            <div className="relative">
              <label htmlFor="staffId" className="absolute -top-2.5 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">
                Staff ID
              </label>
              <div className="flex items-center border border-gray-600 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                <i className="fa-solid fa-id-card text-gray-400 mr-3 w-4 text-center"></i>
                <select
                  id="staffId"
                  name="id"
                  value={staffInfo.id}
                  onChange={handleStaffSelectionChange}
                  className="w-full bg-transparent p-0 border-none text-gray-100 placeholder-gray-400 focus:ring-0 sm:text-sm appearance-none"
                >
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id} className="bg-gray-900 text-white">
                      {staff.id} - {staff.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <EditableField
              id="name"
              label="Name | Title"
              value={staffInfo.name}
              onChange={handleStaffInfoChange}
              iconClass="fa-solid fa-user"
              placeholder="Enter Name & Title"
            />
            <EditableField
              id="phone"
              label="Phone"
              value={staffInfo.phone}
              onChange={handleStaffInfoChange}
              iconClass="fa-solid fa-phone"
              inputType="tel"
              placeholder="Enter Phone Number"
            />
          </footer>

          <div className="pt-4 space-y-3">
            <button
              onClick={handleSaveReport}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              <i className="fas fa-save"></i>
              <span>Save & Copy Report</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleViewReport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              >
                <i className="fas fa-eye"></i>
                <span>View</span>
              </button>
              <button
                onClick={handleShare}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
              >
                <i className="fab fa-whatsapp"></i>
                <span>Share</span>
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[85vh] flex flex-col border border-gray-700">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-white">Generated Report</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close modal">
                  <i className="fas fa-times fa-lg"></i>
               </button>
            </div>
            <div className="flex-grow overflow-y-auto bg-gray-900/50 p-4 rounded-md border border-gray-700">
              <pre className="text-gray-200 text-sm whitespace-pre-wrap font-mono">{reportText}</pre>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;