import { Contract } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createClient } from "urql";
import { useContract, useSigner, erc721ABI } from "wagmi";
import MarketplaceABI from "../../abis/NFTMarketplace.json";
import Navbar from "../../components/Navbar";
import { MARKETPLACE_ADDRESS, SUBGRAPH_URL } from "../../constants";
import styles from "../../styles/Details.module.css";


export default function NFTDetails() {

    const router = useRouter();
    const nftAddress = router.query.nftAddress;
    const tokenId = router.query.tokenId;

    const [ listing, setListing ] = useState();
    const [ imageURI, setImageURI ] = useState("");
    const [ name, setName ] = useState("");
    const [ active, setActive ] = useState(false);
    const [ isOwner, setIsOwner ] = useState(false);

    const [ newPrice, setNewPrice ] = useState("");

    const [ buying, setBuying ] = useState(false);
    const [ updating, setUpdating ] = useState(false);
    const [ cancelling, setCancelling ] = useState(false);
    const [ loading, setLoading ] = useState(false);

    const { data: signer } = useSigner();

    const marketPlaceContract = useContract({
        addressOrName: MARKETPLACE_ADDRESS, 
        contractInterface: MarketplaceABI, 
        signerOrProvider: signer,
    });

    async function fetchListing() {
        try {
            const listingQuery = `
                query ListingQuery {
                    listingEntities(where: {
                        nftAddress: "${nftAddress}",
                        tokenId: "${tokenId}"
                    })  {
                        id
                        nftAddress
                        tokenId
                        price
                        seller
                        buyer
                    }
                }
            `;

            const urqlClient = createClient({
                url: SUBGRAPH_URL
            });
            const response = await urqlClient.query(listingQuery).toPromise();
            let listingEntities = response.data.listingEntities;
            console.log('listingEntities:::', listingEntities)


            if(listingEntities.length === 0) {
                window.alert("Listing does not exist or has been canceled");
                return router.push("/");
            }
            const listing = listingEntities[0];
            const address = await signer.getAddress();

            setActive(listing.buyer === null);
            setIsOwner(address.toLowerCase() === listing.seller.toLowerCase());
            setListing(listing);
        } catch(err) {
            console.error(err);
        }
    }

    async function fetchNFTDetails() {
        try {
            const ERC721Contract = new Contract(nftAddress, erc721ABI, signer);
            let tokenURI = await ERC721Contract.tokenURI(tokenId);
            tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");

            const metadata = await fetch(tokenURI);
            const metadataJSON = await metadata.json();

            let imageURI = metadataJSON.imageUrl;
            imageURI = imageURI.replace("ipfs://", "https://ipfs.io/ipfs/");
            const name = metadataJSON.name;
            setImageURI(imageURI);
            setName(name);

        } catch(err) {
            console.error(err);
        }
    }

    async function updateListing() {
        try {
            setUpdating(true);
            const updateTx = await marketPlaceContract.updateListing(
                nftAddress,
                tokenId,
                parseEther(newPrice)
            );
            await updateTx.wait();
            await fetchListing();
            setUpdating(false);
        } catch(err) {
            console.error(err);
        }
    }

    async function cancelListing() {
        try {
            setCancelling(true);
            const cancelTx = await marketPlaceContract.cancelListing(nftAddress, tokenId);
            await cancelTx.wait();
            window.alert("Listing canceled");
            return router.push("/");
            setCancelling(false);
        } catch(err) {
            console.error(err);
        }
    }

    async function buyListing() {
        try {
            setBuying(true);
            const buyTx = await marketPlaceContract.purchaseListing(
                nftAddress,
                tokenId,
                {
                    value: listing.price,
                }
            );
            await buyTx.wait();
            await fetchListing();
            setBuying(false);
        } catch(err) {
            console.error(err);
        }
    }

    useEffect(() => {
        if(router.query.nftAddress && router.query.tokenId && signer) {
            Promise.all([fetchListing(), fetchNFTDetails()]).finally(() => {
                setLoading(false);
            });
        }
    }, [router, signer]);

    return (
        <>
        <Navbar />
        <div>
            {loading ? (
            <span>Loading...</span>
            ) : (
            <div className={styles.container}>
                <div className={styles.details}>
                <img src={imageURI} />
                <span>
                    <b>
                    {name} - #{tokenId}
                    </b>
                </span>
                <span>Price: {formatEther(listing.price)} CELO</span>
                <span>
                    <a
                    href={`https://alfajores.celoscan.io/address/${listing.seller}`}
                    target="_blank"
                    >
                    Seller: {" "}
                    {isOwner ? "You" : listing.seller.substring(0, 6) + "..."}
                    </a>
                </span>
                <span>Status: {listing.buyer === null ? "Active" : "Sold"}</span>
                </div>
    
                <div className={styles.options}>
                {!active && (
                    <span>
                    Listing has been sold to{" "}
                    <a
                        href={`https://alfajores.celoscan.io/address/${listing.buyer}`}
                        target="_blank"
                    >
                        {listing.buyer}
                    </a>
                    </span>
                )}
    
                {isOwner && active && (
                    <>
                    <div className={styles.updateListing}>
                        <input
                        type="text"
                        placeholder="New Price (in CELO)"
                        value={newPrice}
                        onChange={(e) => {
                            if (e.target.value === "") {
                            setNewPrice("0");
                            } else {
                            setNewPrice(e.target.value);
                            }
                        }}
                        ></input>
                        <button disabled={updating} onClick={updateListing}>
                        Update Listing
                        </button>
                    </div>
    
                    <button
                        className={styles.btn}
                        disabled={cancelling}
                        onClick={cancelListing}
                    >
                        Cancel Listing
                    </button>
                    </>
                )}
    
                {!isOwner && active && (
                    <button
                    className={styles.btn}
                    disabled={buying}
                    onClick={buyListing}
                    >
                    Buy Listing
                    </button>
                )}
                </div>
            </div>
            )}
        </div> 
        </>
    );

}