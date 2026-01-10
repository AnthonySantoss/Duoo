import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, UploadCloud, FileText, FileSpreadsheet, Download, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import api from '../services/api';

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

    const [manualTrans, setManualTrans] = useState({
        title: '',
        amount: '',
        type: 'expense',
        category: 'Alimentação',
        date: new Date().toISOString().split('T')[0],
        wallet_id: ''
    });

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
            if (res.data.length > 0) {
                setManualTrans(prev => ({ ...prev, wallet_id: res.data[0].id }));
                setSelectedWalletForImport(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();

        if (!manualTrans.title || !manualTrans.amount || !manualTrans.wallet_id) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            const amount = manualTrans.type === 'expense'
                ? -Math.abs(parseFloat(manualTrans.amount))
                : Math.abs(parseFloat(manualTrans.amount));

            await api.post('/transactions', {
                title: manualTrans.title,
                amount: amount,
                category: manualTrans.category,
                date: manualTrans.date,
                type: manualTrans.type,
                wallet_id: manualTrans.wallet_id
            });

            alert('Transação adicionada com sucesso!');

            // Reset form
            setManualTrans({
                title: '',
                amount: '',
                type: 'expense',
                category: 'Alimentação',
                date: new Date().toISOString().split('T')[0],
                wallet_id: wallets.length > 0 ? wallets[0].id : ''
            });
        } catch (error) {
            console.error('Failed to add transaction:', error);
            alert(error.response?.data?.error || 'Erro ao adicionar transação');
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
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
            alert('Apenas arquivos CSV e OFX são permitidos');
            return;
        }

        setSelectedFile(file);
        setIsImportModalOpen(true);
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile || !selectedWalletForImport) {
            alert('Selecione um arquivo e uma carteira');
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('wallet_id', selectedWalletForImport);

            const res = await api.post('/import/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setImportResult({
                success: true,
                message: res.data.message,
                count: res.data.count
            });

            // Reset after success
            setTimeout(() => {
                setIsImportModalOpen(false);
                setSelectedFile(null);
                setImportResult(null);
            }, 3000);

        } catch (error) {
            console.error('Failed to import file:', error);
            setImportResult({
                success: false,
                message: error.response?.data?.error || 'Erro ao importar arquivo'
            });
        } finally {
            setImporting(false);
        }
    };

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
            {/* Manual Entry Form */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-bold flex items-center gap-2"><PlusCircle className="text-emerald-500" /> Lançamento Manual</h3>
                    <p className="text-slate-500 text-sm">Adicione transações que não foram sincronizadas automaticamente.</p>
                </div>

                <Card className="space-y-5">
                    <form onSubmit={handleAddTransaction} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Pagamento para encanador"
                                value={manualTrans.title}
                                onChange={(e) => setManualTrans({ ...manualTrans, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor (R$)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    placeholder="0.00"
                                    value={manualTrans.amount}
                                    onChange={(e) => setManualTrans({ ...manualTrans, amount: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data</label>
                                <input
                                    type="date"
                                    required
                                    value={manualTrans.date}
                                    onChange={(e) => setManualTrans({ ...manualTrans, date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Carteira</label>
                            <select
                                required
                                value={manualTrans.wallet_id}
                                onChange={(e) => setManualTrans({ ...manualTrans, wallet_id: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Selecione uma carteira</option>
                                {wallets.map(wallet => (
                                    <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categoria</label>
                                <select
                                    value={manualTrans.category}
                                    onChange={(e) => setManualTrans({ ...manualTrans, category: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option>Alimentação</option>
                                    <option>Lazer</option>
                                    <option>Moradia</option>
                                    <option>Contas</option>
                                    <option>Saúde</option>
                                    <option>Transporte</option>
                                    <option>Educação</option>
                                    <option>Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setManualTrans({ ...manualTrans, type: 'expense' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${manualTrans.type === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Despesa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManualTrans({ ...manualTrans, type: 'income' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${manualTrans.type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Receita
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
                            Adicionar Transação
                        </button>
                    </form>
                </Card>
            </div>

            {/* Import & Export Options */}
            <div className="space-y-6">

                {/* Import Card */}
                <div className="space-y-2">
                    <h3 className="text-lg font-bold flex items-center gap-2"><UploadCloud className="text-purple-500" /> Importação Automática</h3>
                    <p className="text-slate-500 text-sm">Agilize seu controle importando o extrato do banco.</p>
                </div>

                <Card
                    className={`border-2 border-dashed transition-colors cursor-pointer ${dragActive
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
                        <div className={`p-4 rounded-full mb-4 transition-colors ${dragActive
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                            <UploadCloud size={32} className={`transition-colors ${dragActive ? 'text-emerald-500' : 'text-slate-400'
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
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-bold transition-colors"
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
                    <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="text-blue-500" /> Exportar Dados</h3>
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

            {/* Import Modal */}
            <Modal isOpen={isImportModalOpen} onClose={() => !importing && setIsImportModalOpen(false)} title="Importar Extrato">
                <div className="space-y-4">
                    {!importResult ? (
                        <>
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    <strong>Arquivo selecionado:</strong>
                                </p>
                                <p className="text-sm font-medium">{selectedFile?.name}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Selecione a carteira de destino
                                </label>
                                <select
                                    value={selectedWalletForImport}
                                    onChange={(e) => setSelectedWalletForImport(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    disabled={importing}
                                >
                                    {wallets.map(wallet => (
                                        <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-xs text-blue-800 dark:text-blue-300">
                                    <strong>Dica:</strong> As categorias serão detectadas automaticamente com base na descrição das transações.
                                </p>
                            </div>

                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-purple-500/30"
                            >
                                {importing ? 'Importando...' : 'Importar Transações'}
                            </button>
                        </>
                    ) : (
                        <div className={`p-6 rounded-xl text-center ${importResult.success
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
                                    <h4 className="font-bold text-lg text-rose-800 dark:text-rose-300 mb-2">
                                        Erro na Importação
                                    </h4>
                                    <p className="text-sm text-rose-700 dark:text-rose-400">
                                        {importResult.message}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Statement;
