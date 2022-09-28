import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Listing from "../components/Listing";
import { createClient } from "urql";
import styles from "../styles/Home.module.css";
import Link from "next/link";
import { SUBGRAPH_URL } from "../constants";
import { useAccount } from "wagmi";


export default function Home() {

  const [ listings, setListings ] = useState();
  const [ loading, setLoading ] = useState(false);
  const { isConnected } = useAccount();

  async function fetchListings() {
    try {

      setLoading(true);
      const listingQuery = `
        query ListingQuery {
          listingEntities {
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
      const listingEntities = response.data.listingEntities;

      const activeListing = listingEntities.filter((item) => item.buyer === null);
      setListings(activeListing);
      setLoading(false);

    } catch(err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchListings();
  }, []);

  return (
    <>
      <Navbar />
      {loading && !isConnected && (<span>Loading...</span>)}
      <div className={styles.container}> 
        {
          !loading && listings &&
          listings.map((item) => {
            return (
              <Link
                key={item.id}
                href={`/${item.nftAddress}/${item.tokenId}`}
              >
                <a>
                  <Listing
                    nftAddress={item.nftAddress}
                    price={item.price}
                    tokenId={item.tokenId}
                    seller={item.seller}
                  />
                </a>
              </Link>
            )
          })
        }
      </div>
      {/* Show "No listings found" if query returned empty */}
      {!loading && listings && listings.length === 0 && (
        <span>No listings found</span>
      )}
    </>
  );

}