import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    UploadCloud,
    FileText,
    FileSpreadsheet,
    Download,
    Smartphone,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    CheckSquare,
    Square,
    AlertTriangle,
    Layers,
    Filter
} from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import api from '../services/api';
import Toast from '../components/ui/Toast';

const AVAILABLE_CATEGORIES = [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Contas',
    'Saúde',
    'Lazer',
    'Educação',
    'Investimento',
    'Transferência',
    'Receita',
    'Salário',
    'Outros'
];

const formatCurrency = (val) => {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
};

const Statement = () => {
    const { viewMode } = useOutletContext();
    const [wallets, setWallets] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedWalletForImport, setSelectedWalletForImport] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const [toast, setToast] = useState(null);

    // Etapas do modal: 'upload' | 'preview'
    const [step, setStep] = useState('upload');
    const [previewItems, setPreviewItems] = useState([]);
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [summary, setSummary] = useState({ total: 0, newCount: 0, duplicateCount: 0 });

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
            if (res.data.length > 0 && !selectedWalletForImport) {
                setSelectedWalletForImport(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file) => {
        const validExtensions = ['csv', 'ofx'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            setToast({ message: 'Apenas arquivos CSV e OFX são permitidos', type: 'error' });
            return;
        }

        setSelectedFile(file);
        setStep('upload');
        setImportResult(null);
        setPreviewItems([]);
        setSelectedItemIds(new Set());
        setIsImportModalOpen(true);
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const resetImportModal = () => {
        setIsImportModalOpen(false);
        setSelectedFile(null);
        setStep('upload');
        setPreviewItems([]);
        setSelectedItemIds(new Set());
        setSummary({ total: 0, newCount: 0, duplicateCount: 0 });
        setImportResult(null);
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Volta para a etapa de upload para selecionar outro arquivo/carteira
    const handleBackToUpload = () => {
        setStep('upload');
    };

    // Envia o arquivo para a rota de preview
    const handleAnalyzePreview = async () => {
        if (!selectedFile || !selectedWalletForImport) {
            setToast({ message: 'Selecione um arquivo e uma carteira', type: 'error' });
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('wallet_id', selectedWalletForImport);

            const res = await api.post('/import/preview', formData);
            const { items = [], summary: resSummary = {} } = res.data;

            setPreviewItems(items);
            setSummary({
                total: resSummary.total || items.length,
                newCount: resSummary.newCount || 0,
                duplicateCount: resSummary.duplicateCount || 0
            });

            // Itens com isDuplicate: true vêm desmarcados por padrão; novos vêm marcados por padrão
            const initialSelected = new Set(
                items.filter(item => !item.isDuplicate).map(item => item.id)
            );
            setSelectedItemIds(initialSelected);
            setStep('preview');

        } catch (error) {
            console.error('Failed to preview statement:', error);
            const errorMsg = error.response?.data?.error || 'Não foi possível analisar o extrato. Verifique o arquivo.';
            setToast({ message: errorMsg, type: 'error' });
        } finally {
            setImporting(false);
        }
    };

    // Confirma a importação dos itens selecionados
    const handleConfirmImport = async () => {
        const selectedTransactions = previewItems.filter(item => selectedItemIds.has(item.id));
        if (selectedTransactions.length === 0) {
            setToast({ message: 'Selecione pelo menos um lançamento para importar', type: 'error' });
            return;
        }

        setImporting(true);

        try {
            const res = await api.post('/import/confirm', {
                wallet_id: selectedWalletForImport,
                transactions: selectedTransactions
            });

            setImportResult({
                success: true,
                message: res.data.message || `${res.data.count || selectedTransactions.length} lançamentos importados com sucesso!`,
                count: res.data.count || selectedTransactions.length
            });

            await fetchWallets();

            // Fechar modal após 3 segundos
            setTimeout(() => {
                resetImportModal();
            }, 3000);

        } catch (error) {
            console.error('Failed to confirm statement import:', error);
            setImportResult({
                success: false,
                message: error.response?.data?.error || 'Erro ao importar lançamentos selecionados'
            });
        } finally {
            setImporting(false);
        }
    };

    // Toggle individual de item
    const toggleSelectItem = (id) => {
        const next = new Set(selectedItemIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedItemIds(next);
    };

    // Toggle selecionar/desmarcar todos
    const toggleSelectAll = () => {
        if (selectedItemIds.size === previewItems.length) {
            setSelectedItemIds(new Set());
        } else {
            setSelectedItemIds(new Set(previewItems.map(item => item.id)));
        }
    };

    // Alteração de categoria inline na tabela/cards de preview
    const handleCategoryChange = (id, newCategory) => {
        setPreviewItems(current =>
            current.map(item => item.id === id ? { ...item, category: newCategory } : item)
        );
    };

    // Cálculo do total selecionado
    const selectedCount = selectedItemIds.size;
    const selectedNetSum = previewItems
        .filter(item => selectedItemIds.has(item.id))
        .reduce((acc, curr) => acc + (curr.finalAmount || curr.amount || 0), 0);

    const handleExportCSV = () => {
        const url = `${api.defaults.baseURL}/export/csv?viewMode=${viewMode}`;
        window.open(url, '_blank');
    };

    const handleExportPDF = () => {
        const url = `${api.defaults.baseURL}/export/pdf?viewMode=${viewMode}`;
        window.open(url, '_blank');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Android notification capture */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Smartphone className="text-emerald-500" />
                        Captura automática pelo Android
                    </h3>
                    <p className="text-slate-500 text-sm">
                        Registre compras, Pix e transferências a partir das notificações enviadas pelo seu banco.
                    </p>
                </div>

                <Card className="space-y-5">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-5">
                        <h4 className="font-semibold mb-2">Como configurar</h4>
                        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <li><span className="font-bold text-emerald-600">1.</span> Instale o Duoo Capture no Android.</li>
                            <li><span className="font-bold text-emerald-600">2.</span> Faça login e escolha a carteira.</li>
                            <li><span className="font-bold text-emerald-600">3.</span> Permita o acesso às notificações.</li>
                            <li><span className="font-bold text-emerald-600">4.</span> O Duoo registra os gastos compatíveis automaticamente.</li>
                        </ol>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <Smartphone size={16} /> Privacidade
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            O aplicativo Android processa a notificação localmente e envia apenas os dados estruturados da transação. O texto completo da notificação não é enviado ao Duoo.
                        </p>
                    </div>
                </Card>
            </div>

            {/* Import & Export Options */}
            <div className="space-y-6">
                {/* Import Card */}
                <div className="space-y-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <UploadCloud className="text-emerald-500" /> Importação de Extrato
                    </h3>
                    <p className="text-slate-500 text-sm">Agilize seu controle importando o extrato bancário com pré-visualização e deduplicação.</p>
                </div>

                <Card
                    className={`border-2 border-dashed transition-colors cursor-pointer ${
                        dragActive
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className={`p-4 rounded-full mb-4 transition-colors ${
                            dragActive
                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                            <UploadCloud size={32} className={`transition-colors ${
                                dragActive ? 'text-emerald-500' : 'text-slate-400'
                            }`} />
                        </div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">Arraste seu arquivo CSV ou OFX</h4>
                        <p className="text-xs text-slate-500 mb-4">ou clique para selecionar do computador</p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors shadow-md shadow-emerald-500/20"
                        >
                            Selecionar Arquivo
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.ofx"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />
                    </div>
                </Card>

                {/* Export Options */}
                <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileText className="text-blue-500" /> Exportar Dados
                    </h3>
                    <p className="text-slate-500 text-sm">Baixe seu histórico completo para análise externa.</p>
                </div>

                <Card className="grid grid-cols-1 gap-4">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-200 transition-colors">
                                <FileText size={24} />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-900 dark:text-white">Extrato em HTML/PDF</h4>
                                <p className="text-xs text-slate-500">Ideal para impressão e relatórios mensais.</p>
                            </div>
                        </div>
                        <Download size={20} className="text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-200 transition-colors">
                                <FileSpreadsheet size={24} />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-900 dark:text-white">Planilha CSV</h4>
                                <p className="text-xs text-slate-500">Para importar em outros softwares (Excel, Sheets).</p>
                            </div>
                        </div>
                        <Download size={20} className="text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </button>
                </Card>
            </div>

            {/* Modal de Importação com 2 Etapas */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => !importing && resetImportModal()}
                title={
                    step === 'preview'
                        ? 'Pré-visualização do Extrato'
                        : 'Importar Extrato Bancário'
                }
                maxWidth={step === 'preview' ? 'max-w-4xl' : 'max-w-md'}
            >
                {importResult ? (
                    <div className={`p-6 rounded-xl text-center ${
                        importResult.success
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30'
                            : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/30'
                    }`}>
                        {importResult.success ? (
                            <>
                                <CheckCircle size={48} className="mx-auto mb-4 text-emerald-600" />
                                <h4 className="font-bold text-lg text-emerald-800 dark:text-emerald-300 mb-2">
                                    Importação Concluída!
                                </h4>
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                    {importResult.message}
                                </p>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={48} className="mx-auto mb-4 text-rose-600" />
                                <h4 className="font-bold text-lg text-rose-800 dark:text-rose-300 mb-2">
                                    Erro na Importação
                                </h4>
                                <p className="text-sm text-rose-700 dark:text-rose-400 mb-4">
                                    {importResult.message}
                                </p>
                                <button
                                    onClick={() => setImportResult(null)}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Tentar novamente
                                </button>
                            </>
                        )}
                    </div>
                ) : step === 'upload' ? (
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                Arquivo selecionado:
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white break-all">
                                {selectedFile?.name}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Selecione a carteira de destino
                            </label>
                            <Select
                                value={selectedWalletForImport}
                                onChange={(e) => setSelectedWalletForImport(e.target.value)}
                                disabled={importing}
                            >
                                {wallets.map(wallet => (
                                    <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                            <p className="font-semibold">Pré-visualização e Proteção contra Duplicatas</p>
                            <p>
                                Na próxima etapa, você verá todos os lançamentos lidos do arquivo. Duplicatas já registradas no banco serão identificadas automaticamente e virão desmarcadas por padrão.
                            </p>
                        </div>

                        <button
                            onClick={handleAnalyzePreview}
                            disabled={importing}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                        >
                            {importing ? (
                                <>
                                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                    Analisando extrato...
                                </>
                            ) : (
                                'Continuar para Pré-visualização'
                            )}
                        </button>
                    </div>
                ) : (
                    /* Etapa 2: Preview e Seleção de Itens */
                    <div className="space-y-4">
                        {/* Contadores / Resumo */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                                <span className="text-[11px] sm:text-xs text-slate-500 block truncate">Total Lido</span>
                                <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                                    {summary.total}
                                </span>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 sm:p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                                <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 block font-medium truncate">Novos</span>
                                <span className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300">
                                    {summary.newCount}
                                </span>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 sm:p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center">
                                <span className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 block font-medium truncate">Duplicados</span>
                                <span className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-300">
                                    {summary.duplicateCount}
                                </span>
                            </div>
                        </div>

                        {/* Ações da Tabela (Selecionar todos / Contagem) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                                >
                                    {selectedItemIds.size === previewItems.length ? (
                                        <>
                                            <CheckSquare size={14} /> Desmarcar todos
                                        </>
                                    ) : (
                                        <>
                                            <Square size={14} /> Selecionar todos ({previewItems.length})
                                        </>
                                    )}
                                </button>
                                <span>•</span>
                                <span>
                                    <strong>{selectedCount}</strong> de {previewItems.length} selecionados
                                </span>
                            </div>
                            <div className="font-medium">
                                Total líquido:{' '}
                                <span className={selectedNetSum >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                                    {formatCurrency(selectedNetSum)}
                                </span>
                            </div>
                        </div>

                        {/* Visualização Mobile: Cards compactos (< md) */}
                        <div className="md:hidden max-h-[50vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                            {previewItems.map((item) => {
                                const isSelected = selectedItemIds.has(item.id);
                                const categoryOptions = AVAILABLE_CATEGORIES.includes(item.category)
                                    ? AVAILABLE_CATEGORIES
                                    : [item.category, ...AVAILABLE_CATEGORIES];

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3 transition-colors ${
                                            item.isDuplicate
                                                ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                                : isSelected
                                                ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        {/* Linha superior: Checkbox + Título + Valor */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectItem(item.id)}
                                                />
                                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate" title={item.title}>
                                                    {item.title}
                                                </span>
                                            </div>
                                            <span className={`shrink-0 font-bold text-sm text-right ${
                                                item.finalAmount >= 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-slate-900 dark:text-slate-100'
                                            }`}>
                                                {formatCurrency(item.finalAmount)}
                                            </span>
                                        </div>

                                        {/* Segunda linha: Data + Badge de Status */}
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {formatDate(item.date)}
                                            </span>
                                            <div>
                                                {item.isDuplicate ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                    >
                                                        <AlertTriangle size={11} />
                                                        {item.duplicateReason === 'fitid' ? 'Duplicado (FITID)' : 'Duplicado (Data/Valor)'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                        Novo
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Terceira linha: Select de Categoria */}
                                        <div className="mt-2">
                                            <Select
                                                size="sm"
                                                value={item.category || 'Outros'}
                                                onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                                            >
                                                {categoryOptions.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Visualização Desktop: Tabela rolável (>= md) */}
                        <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-80 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10 select-none">
                                    <tr>
                                        <th className="p-3 w-10 text-center">
                                            <Checkbox
                                                checked={selectedItemIds.size === previewItems.length && previewItems.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="p-3 font-semibold">Data</th>
                                        <th className="p-3 font-semibold">Descrição</th>
                                        <th className="p-3 font-semibold">Categoria</th>
                                        <th className="p-3 font-semibold text-right">Valor</th>
                                        <th className="p-3 font-semibold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {previewItems.map((item) => {
                                        const isSelected = selectedItemIds.has(item.id);
                                        const categoryOptions = AVAILABLE_CATEGORIES.includes(item.category)
                                            ? AVAILABLE_CATEGORIES
                                            : [item.category, ...AVAILABLE_CATEGORIES];

                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition-colors ${
                                                    item.isDuplicate
                                                        ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30'
                                                        : isSelected
                                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-100/40'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <td className="p-3 text-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectItem(item.id)}
                                                    />
                                                </td>
                                                <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    {formatDate(item.date)}
                                                </td>
                                                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                                    <div className="truncate max-w-[220px]" title={item.title}>
                                                        {item.title}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Select
                                                        size="sm"
                                                        value={item.category || 'Outros'}
                                                        onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                                                    >
                                                        {categoryOptions.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </Select>
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap font-semibold">
                                                    <span className={
                                                        item.finalAmount >= 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-slate-900 dark:text-slate-100'
                                                    }>
                                                        {formatCurrency(item.finalAmount)}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    {item.isDuplicate ? (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                            title={
                                                                item.duplicateReason === 'fitid'
                                                                    ? 'Identificado pelo código bancário FITID'
                                                                    : 'Mesma data, valor e título já cadastrados'
                                                            }
                                                        >
                                                            <AlertTriangle size={11} />
                                                            {item.duplicateReason === 'fitid' ? 'Duplicado (FITID)' : 'Duplicado (Data/Valor)'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                            Novo
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Rodapé Responsivo (empilhado no mobile) */}
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleBackToUpload}
                                disabled={importing}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                            >
                                <ArrowLeft size={16} />
                                Voltar
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmImport}
                                disabled={importing || selectedCount === 0}
                                className="w-full sm:flex-1 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-sm"
                            >
                                {importing ? (
                                    <>
                                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                        Importando...
                                    </>
                                ) : (
                                    `Confirmar Importação (${selectedCount} selecionados)`
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default Statement;
