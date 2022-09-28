import { Contract } from "ethers";
import { isAddress, parseEther } from "ethers/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { useSigner, erc721ABI } from "wagmi";
import MarketplaceABI from "../abis/NFTMarketplace.json";
import Navbar from "../components/Navbar";
import styles from "../styles/Create.module.css";
import { MARKETPLACE_ADDRESS } from "../constants";

export default function Create() {

    const [ nftAddress, setNFTAddress ] = useState("");
    const [ price, setPrice ] = useState();
    const [ tokenId, setTokenId ] = useState();
    const [showListingLink, setShowListingLink] = useState(false);
    const [ loading, setLoading ] = useState(false);

    const { data: signer } = useSigner();

    async function handleCreateListing() {
        setLoading(true);

        try {
            const isValidAddr = isAddress(nftAddress);
            if (!isValidAddr) {
                throw new Error("not valid address");
            }
            await requestApproval();
            await createListing();
            setShowListingLink(true);
        } catch(err) {
            console.log(err);
        }

        setLoading(false);
    }

    async function requestApproval() {
        try {
            const senderAddr = await signer.getAddress();
            const ERC721Contract = new Contract(nftAddress, erc721ABI, signer);
            const isOwner = await ERC721Contract.ownerOf(tokenId);
            if(isOwner.toLowerCase() !== senderAddr.toLowerCase()) {
                throw new Error("You are not a owner");
            }
            const isApproved = await ERC721Contract.isApprovedForAll(
                senderAddr,
                MARKETPLACE_ADDRESS,
            )
            if(!isApproved) {
                const approvalTx = await ERC721Contract.setApprovalForAll(
                    MARKETPLACE_ADDRESS,
                    true,
                );
                await approvalTx.wait();
            }
        } catch(err) {
            console.error(err);
        }
    }

    async function createListing() {
        try {
            const marketContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer);
            const tx = await marketContract.createListing(
                nftAddress,
                tokenId,
                parseEther(price),
            );
            await tx.wait();

        } catch(err) {
            console.error(err);
        }
    }

    return (
        <>
          {/* Show the navigation bar */}
          <Navbar />
    
          {/* Show the input fields for the user to enter contract details */}
          <div className={styles.container}>
            <input
              type="text"
              placeholder="NFT Address 0x..."
              value={nftAddress}
              onChange={(e) => setNFTAddress(e.target.value)}
            />
            <input
              type="text"
              placeholder="Token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Price (in CELO)"
              value={price}
              onChange={(e) => {
                if (e.target.value === "") {
                  setPrice("0");
                } else {
                  setPrice(e.target.value);
                }
              }}
            />
            {/* Button to create the listing */}
            <button onClick={handleCreateListing} disabled={loading}>
              {loading ? "Loading..." : "Create"}
            </button>
    
            {/* Button to take user to the NFT details page after listing is created */}
            {showListingLink && (
              <Link href={`/${nftAddress}/${tokenId}`}>
                <a>
                  <button>View Listing</button>
                </a>
              </Link>
            )}
          </div>
        </>
      );

}