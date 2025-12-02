import React, { useState, useEffect, useRef } from 'react';
import {
    Camera, Upload, CheckCircle, Settings, RefreshCw,
    AlertCircle, ChevronLeft, Image as ImageIcon, FileText
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../utils/firebase';
import { compressImage } from '../utils/fileHelpers';

const DEFAULT_PROMPT = "Atue como um especialista em cinologia. Identifique a raça do cão na imagem, descreva seu temperamento, nível de energia e cuidados. Responda em Português do Brasil com formatação rica.";

export default function BreedIdentifier() {
    // --- STATE MACHINE ---
    // Steps: 'config' | 'orientation' | 'camera' | 'loading' | 'result'
    const [step, setStep] = useState('config');

    // --- DATA ---
    const [apiKey, setApiKey] = useState('');
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
    const [selectedImage, setSelectedImage] = useState(null); // Base64 for display
    const [apiResult, setApiResult] = useState('');
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // --- LIFECYCLE ---
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'breed_settings');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.apiKey) {
                        setApiKey(data.apiKey);
                        // Only auto-advance if we have a key
                        setStep('orientation');
                    }
                    if (data.systemPrompt) {
                        setSystemPrompt(data.systemPrompt);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar configurações:", error);
            }
        };
        loadSettings();
    }, []);

    // --- ACTIONS ---
    const handleSaveConfig = async () => {
        if (!apiKey.trim()) {
            setError("Por favor, insira uma API Key válida.");
            return;
        }

        try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'breed_settings');
            await setDoc(docRef, {
                apiKey,
                systemPrompt
            });

            setError(null);
            setStep('orientation');
        } catch (error) {
            console.error("Erro ao salvar:", error);
            setError("Erro ao salvar configurações no banco de dados.");
        }
    };

    const handleResetConfig = () => {
        setStep('config');
        setError(null);
    };

    const processImage = async (file) => {
        if (!file) return;

        try {
            setStep('loading');
            setError(null);

            // 1. Compress Image
            const compressedBlob = await compressImage(file);

            // 2. Convert to Base64 for Display and API
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;
                setSelectedImage(base64String);

                // 3. Call Gemini API
                await identifyBreed(base64String);
            };
            reader.readAsDataURL(compressedBlob);

        } catch (err) {
            console.error("Erro ao processar imagem:", err);
            setError("Erro ao processar a imagem. Tente novamente.");
            setStep('camera');
        }
    };

    const identifyBreed = async (base64Image) => {
        try {
            // Remove header (data:image/jpeg;base64,)
            const base64Data = base64Image.split(',')[1];

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: systemPrompt },
                                {
                                    inline_data: {
                                        mime_type: "image/jpeg",
                                        data: base64Data
                                    }
                                }
                            ]
                        }]
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || "Erro na comunicação com a API.");
            }

            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                setApiResult(data.candidates[0].content.parts[0].text);
                setStep('result');
            } else {
                throw new Error("A IA não retornou uma resposta válida.");
            }

        } catch (err) {
            console.error("Erro na API:", err);
            setError(`Erro: ${err.message}`);
            setStep('camera'); // Allow retry
        }
    };

    const handleNewAnalysis = () => {
        setSelectedImage(null);
        setApiResult('');
        setStep('camera');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Por favor, permita pop-ups para gerar o relatório.");

        const date = new Date().toLocaleDateString('pt-BR');

        // Convert markdown-like text to simple HTML for print
        const formattedText = apiResult
            .split('\n')
            .map(line => {
                if (line.startsWith('## ')) return `<h2 style="font-size: 18px; font-weight: bold; color: #1e40af; margin-top: 20px; margin-bottom: 10px;">${line.replace('## ', '')}</h2>`;
                if (line.startsWith('### ')) return `<h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-top: 15px; margin-bottom: 8px;">${line.replace('### ', '')}</h3>`;
                if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) return `<li style="margin-left: 20px; margin-bottom: 4px;">${line.replace(/^[\*\-]\s/, '')}</li>`;
                if (line.trim() === '') return '<br/>';
                return `<p style="margin-bottom: 8px; line-height: 1.5;">${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
            })
            .join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Relatório de Raça - Dog Hotel</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #1f2937; }
                    h1 { text-align: center; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
                    .header-info { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 40px; }
                    .image-container { text-align: center; margin-bottom: 30px; }
                    img { max-width: 300px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    .content { max-width: 800px; margin: 0 auto; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Relatório de Identificação de Raça</h1>
                <div class="header-info">Gerado em: ${date} • Dog Hotel App</div>
                
                <div class="image-container">
                    ${selectedImage ? `<img src="${selectedImage}" alt="Cão Analisado" />` : ''}
                </div>

                <div class="content">
                    ${formattedText}
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() { window.close(); }
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // --- RENDERERS ---

    const renderConfig = () => (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md border border-secondary-100">
            <h2 className="text-xl font-bold text-primary-800 mb-4 flex items-center gap-2">
                <Settings size={24} /> Configuração IA
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Gemini API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Cole sua chave API aqui..."
                        className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                        Sua chave será salva no banco de dados do sistema.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Prompt do Sistema</label>
                    <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={4}
                        className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <button
                    onClick={handleSaveConfig}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition shadow-lg"
                >
                    Salvar e Continuar
                </button>
            </div>
        </div>
    );

    const renderOrientation = () => (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md border border-secondary-100 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                <ImageIcon size={32} />
            </div>

            <h2 className="text-2xl font-bold text-secondary-800 mb-2">Identificar Raça</h2>
            <p className="text-secondary-600 mb-6">
                Use a inteligência artificial para descobrir a raça do seu cãozinho.
            </p>

            <div className="bg-secondary-50 p-4 rounded-lg text-left space-y-3 mb-6">
                <h3 className="font-bold text-secondary-800 text-sm uppercase tracking-wide">Dicas para melhor resultado:</h3>
                <ul className="space-y-2">
                    {[
                        "Boa iluminação",
                        "Corpo inteiro ou rosto de frente",
                        "Evite fotos tremidas",
                        "Apenas um cão na foto"
                    ].map((tip, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-secondary-700">
                            <CheckCircle size={16} className="text-green-500 shrink-0" /> {tip}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={() => setStep('camera')}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition shadow-lg"
                >
                    OK, Entendi
                </button>

                <button
                    onClick={() => setStep('config')}
                    className="w-full text-secondary-500 py-2 text-sm hover:text-secondary-700 flex items-center justify-center gap-2"
                >
                    <Settings size={14} /> Configurar API
                </button>
            </div>
        </div>
    );

    const renderCamera = () => (
        <div className="max-w-md mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={() => setStep('orientation')} className="p-2 hover:bg-secondary-100 rounded-full text-secondary-600">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-lg font-bold text-secondary-800">Tirar Foto</h2>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2 shadow-sm border border-red-100">
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {/* Camera Button */}
                <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-md border-2 border-primary-100 hover:border-primary-500 transition-all text-center"
                >
                    <div className="absolute inset-0 bg-primary-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                            <Camera size={32} />
                        </div>
                        <span className="font-bold text-lg text-secondary-800">Usar Câmera</span>
                        <span className="text-xs text-secondary-500">Tire uma foto agora</span>
                    </div>
                </button>

                {/* Gallery Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-md border-2 border-secondary-100 hover:border-secondary-400 transition-all text-center"
                >
                    <div className="absolute inset-0 bg-secondary-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center text-secondary-600 group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                        </div>
                        <span className="font-bold text-lg text-secondary-800">Galeria</span>
                        <span className="text-xs text-secondary-500">Escolha dos arquivos</span>
                    </div>
                </button>
            </div>

            {/* Hidden Inputs */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                className="hidden"
                onChange={(e) => processImage(e.target.files[0])}
            />
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => processImage(e.target.files[0])}
            />
        </div>
    );

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-secondary-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw size={24} className="text-primary-600 animate-pulse" />
                </div>
            </div>
            <h3 className="text-xl font-bold text-secondary-800 mb-2">Analisando...</h3>
            <p className="text-secondary-500 max-w-xs">
                A inteligência artificial está identificando as características do cão.
            </p>
        </div>
    );

    const renderResult = () => (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-secondary-100 overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full">
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #breed-result-content, #breed-result-content * {
                        visibility: visible;
                    }
                    #breed-result-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                `}
            </style>
            <div id="breed-result-content">
                <div className="bg-primary-600 p-4 flex items-center justify-between text-white print:bg-white print:text-black print:border-b print:border-black">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <CheckCircle size={20} /> Resultado da Análise
                    </h2>
                    <div className="flex items-center gap-2 no-print">
                        <button
                            onClick={handlePrint}
                            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full transition flex items-center gap-1"
                        >
                            <FileText size={14} /> PDF
                        </button>
                        <button
                            onClick={handleNewAnalysis}
                            className="text-xs bg-primary-700 hover:bg-primary-800 px-3 py-1 rounded-full transition"
                        >
                            Nova Análise
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 print:flex-row">
                        {/* Image Preview */}
                        <div className="shrink-0 mx-auto md:mx-0">
                            <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg overflow-hidden shadow-md border border-secondary-200 bg-secondary-50 relative print:shadow-none print:border">
                                {selectedImage && (
                                    <img
                                        src={selectedImage}
                                        alt="Analyzed Dog"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Text Result */}
                        <div className="flex-1 space-y-4">
                            <div className="prose prose-sm max-w-none text-secondary-700">
                                {/* Simple Markdown Rendering */}
                                {apiResult.split('\n').map((line, i) => {
                                    // Headers
                                    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-primary-800 mt-4 mb-2">{line.replace('## ', '')}</h2>;
                                    if (line.startsWith('### ')) return <h3 key={i} className="text-md font-bold text-secondary-800 mt-3 mb-1">{line.replace('### ', '')}</h3>;
                                    // Bold
                                    const parts = line.split('**');
                                    if (parts.length > 1) {
                                        return (
                                            <p key={i} className="mb-2">
                                                {parts.map((part, index) =>
                                                    index % 2 === 1 ? <strong key={index} className="text-secondary-900">{part}</strong> : part
                                                )}
                                            </p>
                                        );
                                    }
                                    // List items
                                    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                                        return <li key={i} className="ml-4 list-disc mb-1">{line.replace(/^[\*\-]\s/, '')}</li>;
                                    }
                                    // Empty lines
                                    if (!line.trim()) return <br key={i} />;

                                    return <p key={i} className="mb-2">{line}</p>;
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-secondary-100 flex justify-end">
                        <button
                            onClick={handleNewAnalysis}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition shadow flex items-center gap-2"
                        >
                            <RefreshCw size={18} /> Analisar Outro Cão
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 min-h-full bg-secondary-50/50">
            {step === 'config' && renderConfig()}
            {step === 'orientation' && renderOrientation()}
            {step === 'camera' && renderCamera()}
            {step === 'loading' && renderLoading()}
            {step === 'result' && renderResult()}
        </div>
    );
}
