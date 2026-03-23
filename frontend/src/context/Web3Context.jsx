import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const Web3Context = createContext(null);

const SEPOLIA_NETWORK_ID = '0xaa36a7';
const SEPOLIA_NETWORK_NAME = 'Sepolia Testnet';
const SOLANA_RPC = clusterApiUrl('devnet');

export function Web3Provider({ children }) {
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [networkType, setNetworkType] = useState('ethereum'); // 'ethereum' or 'solana'
    const [solanaAddress, setSolanaAddress] = useState(null);

    // ─── Ethereum Event Listeners ───────────────────────────────────────────────
    useEffect(() => {
        if (!window.ethereum) return;

        // Restore already-connected account on load
        window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => { if (accounts.length > 0) setAccount(accounts[0]); })
            .catch(console.error);

        window.ethereum.request({ method: 'eth_chainId' })
            .then(id => setChainId(id))
            .catch(console.error);

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                setAccount(null);
                toast('Ethereum wallet disconnected', { icon: '🔌' });
            } else {
                setAccount(accounts[0]);
                toast.success('Ethereum account switched');
            }
        };

        const handleChainChanged = (hexChainId) => {
            setChainId(hexChainId);
            if (hexChainId !== SEPOLIA_NETWORK_ID) {
                toast.error('⚠️ Wrong Ethereum network! Please switch to Sepolia.');
            } else {
                toast.success('Switched to Sepolia Testnet ✅');
            }
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        // Cleanup to avoid memory leaks & duplicate listeners
        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, []);

    // ─── Solana (Phantom) Event Listeners ────────────────────────────────────────
    useEffect(() => {
        const solana = window.solana;
        if (!solana || !solana.isPhantom) return;

        // Restore existing Phantom session
        if (solana.isConnected && solana.publicKey) {
            setSolanaAddress(solana.publicKey.toString());
        }

        const handleAccountChanged = (publicKey) => {
            if (publicKey) {
                setSolanaAddress(publicKey.toString());
                toast.success('Phantom account switched');
            } else {
                setSolanaAddress(null);
                toast('Phantom wallet disconnected', { icon: '🔌' });
            }
        };

        solana.on('accountChanged', handleAccountChanged);

        return () => {
            solana.off('accountChanged', handleAccountChanged);
        };
    }, []);

    const connectSolana = async () => {
        setIsConnecting(true);
        try {
            const { solana } = window;
            if (!solana || !solana.isPhantom) {
                toast.error('Phantom wallet not found! Please install it.');
                window.open('https://phantom.app/', '_blank');
                return;
            }
            const response = await solana.connect();
            setSolanaAddress(response.publicKey.toString());
            setNetworkType('solana');
            toast.success('Solana wallet connected!');
        } catch (err) {
            console.error('Solana connection error:', err);
            toast.error('Failed to connect Solana wallet');
        } finally {
            setIsConnecting(false);
        }
    };

    const connectEthereum = async () => {
        if (!window.ethereum) {
            toast.error('MetaMask not found!');
            return;
        }
        setIsConnecting(true);
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccount(accounts[0]);
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(currentChainId);
            setNetworkType('ethereum');
            if (currentChainId !== SEPOLIA_NETWORK_ID) {
                toast.error('⚠️ Not on Sepolia! Please switch networks.');
            } else {
                toast.success('Ethereum wallet connected!');
            }
        } catch (err) {
            console.error('Ethereum connection error:', err);
            toast.error('Failed to connect Ethereum wallet');
        } finally {
            setIsConnecting(false);
        }
    };

    const updateRpc = useCallback(async () => {
        try {
            toast.loading('Requesting MetaMask to use a faster RPC...', { id: 'rpc-update' });
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: SEPOLIA_NETWORK_ID,
                    chainName: SEPOLIA_NETWORK_NAME,
                    nativeCurrency: { name: 'Sepolia Ether', symbol: 'SepoliaETH', decimals: 18 },
                    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://1rpc.io/sepolia', 'https://rpc.sepolia.org'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
            });
            toast.success('RPC Updated! Try your transaction again.', { id: 'rpc-update' });
        } catch (err) {
            toast.error('Failed to update RPC: ' + err.message, { id: 'rpc-update' });
        }
    }, []);

    const switchToSepolia = useCallback(async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_NETWORK_ID }],
            });
        } catch (err) {
            // If network not found, suggest adding it with a reliable RPC
            if (err.code === 4902 || err.message.includes('Unrecognized chain')) {
                updateRpc();
            } else {
                toast.error('Failed to switch to Sepolia: ' + err.message);
            }
        }
    }, [updateRpc]);

    const value = {
        account: networkType === 'ethereum' ? account : solanaAddress,
        chainId,
        networkType,
        setNetworkType,
        isConnecting,
        connect: networkType === 'ethereum' ? connectEthereum : connectSolana,
        isConnected: networkType === 'ethereum' ? !!account : !!solanaAddress,
        isCorrectNetwork: chainId === SEPOLIA_NETWORK_ID,
        solanaAddress,
        solanaRpc: SOLANA_RPC,
        switchToSepolia,
        updateRpc,
    };

    return (
        <Web3Context.Provider value={value}>
            {children}
        </Web3Context.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWeb3 = () => useContext(Web3Context);
