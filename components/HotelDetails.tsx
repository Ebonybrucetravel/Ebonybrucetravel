"use client";
import React, { useState, useEffect } from "react";

interface RoomOption {
  type: string;
  guests: number;
  price: number;
  currency: string;
  options: string[];
  offerId?: string;
}

interface AmenityGroup {
  group: string;
  items: string[];
}

interface HotelDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: (room?: RoomOption) => void;
}

const HotelDetails: React.FC<HotelDetailsProps> = ({
  item,
  searchParams,
  onBack,
  onBook,
}) => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hotelData, setHotelData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("=== HOTEL DETAILS DEBUG ===");
    console.log("Hotel Details Component Mounted");
    console.log("Item:", item);
    console.log("Item has realData:", item?.realData);
    console.log("Full searchParams object:", searchParams);
    console.log("searchParams?.adults value:", searchParams?.adults);
    console.log("Type of searchParams?.adults:", typeof searchParams?.adults);
    console.log("===========================");
    
    window.scrollTo(0, 0);
    if (item) {
      fetchHotelDetails();
    }
  }, [item]);

  // Helper function to parse adults from searchParams
  const parseAdultsFromSearchParams = (): number => {
    const adultsFromSearch = searchParams?.adults;
    
    console.log("parseAdultsFromSearchParams called with:", adultsFromSearch);
    
    if (adultsFromSearch === undefined || adultsFromSearch === null) {
      console.log("No adults found in searchParams, checking item.realData...");
      // Check if item.realData has guests
      if (item?.realData?.guests) {
        console.log("Found guests in item.realData:", item.realData.guests);
        return parseInt(item.realData.guests, 10) || 1;
      }
      console.log("No guests found anywhere, defaulting to 1");
      return 1; // Default to 1, not 2
    }
    
    let parsedAdults = 1; // Default to 1, not 2
    
    if (typeof adultsFromSearch === 'string') {
      parsedAdults = parseInt(adultsFromSearch, 10);
      console.log("Parsed string adultsFromSearch:", adultsFromSearch, "to:", parsedAdults);
    } else if (typeof adultsFromSearch === 'number') {
      parsedAdults = adultsFromSearch;
      console.log("Using number adultsFromSearch:", adultsFromSearch);
    }
    
    // If parsing failed or resulted in 0, use 1
    if (isNaN(parsedAdults) || parsedAdults < 1) {
      console.log("Invalid adults value, defaulting to 1");
      parsedAdults = 1;
    }
    
    console.log("Final parsed adults:", parsedAdults);
    return parsedAdults;
  };

  const fetchHotelDetails = async () => {
    console.log("=== fetchHotelDetails DEBUG ===");
    console.log("Current searchParams:", searchParams);
    
    // Get the actual adults count
    const parsedAdults = parseAdultsFromSearchParams();
    console.log("Parsed adults count:", parsedAdults);
    
    // Check if we have the realData structure from the API
    if (!item?.realData?.offerId) {
      console.warn("No offerId found in item.realData:", item);
      setError("Hotel offer not found");
      setHotelData(item);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Using item.realData for hotel details:", item.realData);
      
      const hotelOfferData = item.realData;
      
      // Create a hotel object from the realData
      const hotelFromRealData = {
        ...item,
        hotelId: hotelOfferData.hotelId,
        name: hotelOfferData.hotelName,
        price: hotelOfferData.price,
        basePrice: hotelOfferData.basePrice,
        currency: hotelOfferData.currency,
        checkInDate: hotelOfferData.checkInDate,
        checkOutDate: hotelOfferData.checkOutDate,
        // Use parsedAdults
        guests: parsedAdults,
        rooms: hotelOfferData.rooms,
        roomType: hotelOfferData.roomType,
        bedType: hotelOfferData.bedType,
        beds: hotelOfferData.beds,
        nights: hotelOfferData.nights,
        isRefundable: hotelOfferData.isRefundable,
        cancellationPolicy: hotelOfferData.cancellationPolicy,
        paymentType: hotelOfferData.paymentType,
        finalPrice: hotelOfferData.finalPrice,
        markupAmount: hotelOfferData.markupAmount,
        serviceFee: hotelOfferData.serviceFee,
        offers: [{
          id: hotelOfferData.offerId,
          room: {
            type: hotelOfferData.roomType,
            typeEstimated: {
              category: hotelOfferData.roomType,
              beds: hotelOfferData.beds,
              bedType: hotelOfferData.bedType
            }
          },
          // Use parsedAdults
          guests: {
            adults: parsedAdults
          },
          price: {
            total: hotelOfferData.price.toString(),
            base: hotelOfferData.basePrice?.toString() || hotelOfferData.price.toString(),
            currency: hotelOfferData.currency
          },
          policies: {
            refundable: hotelOfferData.isRefundable ? {
              cancellationRefund: "REFUNDABLE"
            } : {
              cancellationRefund: "NON_REFUNDABLE"
            },
            cancellations: hotelOfferData.cancellationPolicy ? [{
              description: {
                text: hotelOfferData.cancellationPolicy
              }
            }] : undefined
          }
        }]
      };
      
      console.log("Created hotelFromRealData with guests:", hotelFromRealData.guests);
      
      setHotelData(hotelFromRealData);
      
    } catch (err: any) {
      console.error("Error processing hotel details:", err);
      setError(err.message || "Failed to load hotel details. Please try again.");
      setHotelData(item);
    } finally {
      setLoading(false);
    }
  };

  const hotel = hotelData || item;

  const getImages = () => {
    if (!hotel) return [];
    
    const images: string[] = [];
    
    if (hotel.imageUrl) {
      images.push(hotel.imageUrl);
    }
    
    if (hotel.images && Array.isArray(hotel.images)) {
      hotel.images.forEach((img: any) => {
        if (img.url) images.push(img.url);
      });
    }
    
    if (images.length === 0 && hotel.image) {
      images.push(hotel.image);
    }
    
    if (images.length === 0) {
      return [
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&q=80&w=600",
      ];
    }
    
    while (images.length < 5) {
      images.push("https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=1200");
    }
    
    return images.slice(0, 5);
  };

  const images = getImages();

  const parseRoomOptions = (): RoomOption[] => {
    console.log("=== parseRoomOptions DEBUG ===");
    
    // Get the actual adults count
    const parsedAdults = parseAdultsFromSearchParams();
    console.log("Using guests count:", parsedAdults);
    
    // First check if we have realData from API
    if (hotel?.realData) {
      const realData = hotel.realData;
      console.log("Creating room option from realData with guests:", parsedAdults);
      
      return [{
        type: realData.roomType || "Standard Room",
        // Use parsedAdults
        guests: parsedAdults,
        price: realData.price || 0,
        currency: realData.currency || "USD",
        options: [
          realData.isRefundable ? "Free cancellation" : "Non-refundable",
          `${realData.beds || 1} ${realData.bedType || "bed"}`,
          `${realData.nights || 1} night${(realData.nights || 1) > 1 ? 's' : ''}`
        ],
        offerId: realData.offerId
      }];
    }
    
    // Fallback to offers structure
    if (hotel?.offers && Array.isArray(hotel.offers) && hotel.offers.length > 0) {
      return hotel.offers.map((offer: any): RoomOption => {
        const roomType = offer.room?.type || 
                         offer.room?.typeEstimated?.category ||
                         offer.room?.description?.text ||
                         "Standard Room";
        
        // Use parsedAdults
        const guests = parsedAdults;
        
        let price = 0;
        let currency = "USD";
        
        if (offer.price) {
          if (offer.price.total) {
            price = parseFloat(offer.price.total);
            currency = offer.price.currency || "USD";
          } else if (offer.price.base) {
            price = parseFloat(offer.price.base);
            currency = offer.price.currency || "USD";
          }
        }
        
        const options: string[] = [];
        
        if (offer.policies?.refundable?.cancellationRefund === "REFUNDABLE" || 
            offer.policies?.cancellation?.type === "FREE_CANCELLATION") {
          options.push("Free cancellation");
        } else {
          options.push("Non-refundable");
        }
        
        if (offer.room?.typeEstimated?.beds) {
          options.push(`${offer.room.typeEstimated.beds} bed(s)`);
        }
        
        if (offer.room?.description?.text) {
          const desc = offer.room.description.text;
          if (desc.length > 30) {
            options.push(desc.substring(0, 30) + "...");
          } else {
            options.push(desc);
          }
        }
        
        if (options.length === 0) {
          options.push("Standard amenities", "Free Wi-Fi");
        }

        return {
          type: roomType,
          guests: guests,
          price: price,
          currency: currency,
          options: options,
          offerId: offer.id
        };
      });
    }

    // Fallback defaults
    console.log("Using fallback defaults with guests:", parsedAdults);
    return [
      {
        type: "Classic room",
        guests: parsedAdults,
        price: hotel?.realData?.price || 110.0,
        currency: hotel?.realData?.currency || "USD",
        options: ["Free cancellation", "No prepayment"],
        offerId: hotel?.realData?.offerId
      }
    ];
  };

  const roomOptions = parseRoomOptions();
  console.log("Created roomOptions:", roomOptions);

  const parseAmenities = (): AmenityGroup[] => {
    if (hotel?.amenities && Array.isArray(hotel.amenities)) {
      const amenities: AmenityGroup[] = hotel.amenities.reduce((acc: AmenityGroup[], amenity: any): AmenityGroup[] => {
        const group = amenity.category || "Common";
        const existingGroup = acc.find(g => g.group === group);
        
        const amenityName = amenity.description || amenity.name || "Unknown";
        
        if (existingGroup) {
          existingGroup.items.push(amenityName);
        } else {
          acc.push({
            group: group,
            items: [amenityName]
          });
        }
        
        return acc;
      }, []);

      return amenities;
    }

    return [
      {
        group: "Common",
        items: ["Free Wi-Fi", "Swimming Pool", "Air Conditioning", "Flat-screen TV", "Ensuite Bathroom", "Balcony"]
      },
      {
        group: "Kitchen",
        items: ["Refrigerator", "Kitchenette", "Electric kettle", "Microwave", "Dining area", "Coffee machine"]
      },
      {
        group: "Wellness",
        items: ["Fitness center", "Spa and wellness center", "Massage", "Hot tub/Jacuzzi"]
      },
      {
        group: "Services",
        items: ["Room service", "24-hour front desk", "Concierge service", "Laundry", "Airport shuttle"]
      },
    ];
  };

  const amenities = parseAmenities();

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setIsGalleryOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    document.body.style.overflow = "auto";
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGalleryOpen) return;

      if (e.key === "Escape") {
        closeGallery();
      } else if (e.key === "ArrowRight") {
        goToNextImage();
      } else if (e.key === "ArrowLeft") {
        goToPrevImage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isGalleryOpen]);

  const policies = [
    { label: "Check-in", value: hotel.checkInTime || "From 2:00 PM" },
    { label: "Check-out", value: hotel.checkOutTime || "Until 11:00 AM" },
    {
      label: "Cancellation / Prepayment",
      value:
        hotel.cancellationPolicy ||
        hotel.realData?.cancellationPolicy ||
        "Cancellation and prepayment policies vary according to accommodation type. Please enter the dates of your stay and check the conditions of your required room.",
    },
    {
      label: "Children and extra beds",
      value:
        hotel.childrenPolicy ||
        "Children of all ages are welcome. Children 12 years and above are considered adults at this hotel.",
    },
    { label: "Pets", value: hotel.petsPolicy || "Pets are not allowed." },
    {
      label: "Payment methods",
      value: hotel.paymentMethods || "Cash, Visa, Mastercard, American Express",
    },
  ];

  const renderOverview = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">
            About this Hotel
          </h2>
          <div className="text-sm text-gray-500 font-medium leading-relaxed space-y-4">
            <p>
              {hotel.description || hotel.hotel?.description?.text || `${hotel.name || hotel.title || "This premium hotel"} provides premium, air-conditioned accommodations with free Wi-Fi in a prime urban location. Every suite is meticulously designed to offer a perfect blend of modern comfort and sophisticated local style.`}
            </p>
            <p>
              Featuring state-of-the-art facilities, guests can enjoy a seamless stay with high-speed connectivity and luxury bedding. The hotel is ideally situated within walking distance of the city's main attractions.
            </p>
          </div>
        </div>
        <div className="w-full lg:w-64 h-40 rounded-2xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
          <img
            src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=600"
            className="w-full h-full object-cover"
            alt="Property Map"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-12 border-t border-gray-50">
        {[
          { label: "Property Type", value: hotel.type || "Boutique Hotel" },
          { label: "Year Built", value: "2018 (Renovated)" },
          { label: "Staff Languages", value: "EN, IT, FR" },
          { label: "Room Count", value: `${roomOptions.length} Luxury Suites` },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
              {stat.label}
            </p>
            <p className="text-xs font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRooms = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
        <table className="w-full text-left table-fixed">
          <thead className="bg-[#f8fbfe] border-b border-gray-100">
            <tr>
              <th className="w-[30%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Room Type
              </th>
              <th className="w-[12%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Sleeps
              </th>
              <th className="w-[20%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Price
              </th>
              <th className="w-[23%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Your Options
              </th>
              <th className="w-[15%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {roomOptions.map((room: RoomOption, i: number) => (
              <tr key={i} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-6">
                  <p className="text-sm font-black text-[#33a8da] hover:underline cursor-pointer truncate">
                    {room.type}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="w-3 h-3 bg-blue-50 rounded"></span>
                    <span className="w-3 h-3 bg-gray-50 rounded"></span>
                  </div>
                </td>
                <td className="px-4 py-6">
                  <div className="flex gap-0.5 text-gray-300">
                    {[...Array(room.guests)].map((_, j) => (
                      <svg
                        key={j}
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-1">
                    {room.guests} {room.guests === 1 ? 'Adult' : 'Adults'}
                  </p>
                </td>
                <td className="px-4 py-6">
                  <p className="text-base font-black text-gray-900">
                    {room.currency} {room.price.toFixed(2)}
                  </p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap">
                    Includes taxes
                  </p>
                </td>
                <td className="px-4 py-6">
                  <div className="space-y-1.5">
                    {room.options.map((opt: string, k: number) => (
                      <div
                        key={k}
                        className="flex items-center gap-1.5 text-[9px] font-bold text-green-600 uppercase tracking-tighter"
                      >
                        <svg
                          className="w-2.5 h-2.5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={5}
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="truncate">{opt}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-6 text-right">
                  <button
                    onClick={() => onBook(room)}
                    className="bg-[#33a8da] text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-[#2c98c7] transition active:scale-95 whitespace-nowrap"
                  >
                    Reserve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row gap-16 items-start">
        <div className="w-full md:w-64 space-y-8 shrink-0">
          <div className="flex items-center gap-5">
            <div className="text-5xl font-black text-[#33a8da] tracking-tighter">
              {hotel.rating || "4.9"}
            </div>
            <div className="space-y-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-3.5 h-3.5 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                1,240 Reviews
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {["Cleanliness", "Location", "Service"].map((metric) => (
              <div key={metric}>
                <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  <span>{metric}</span>
                  <span className="text-gray-900">4.9</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#33a8da] w-[98%]"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-10">
          {[1, 2].map((rev) => (
            <div
              key={rev}
              className="pb-8 border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                  <img
                    src={`https://ui-avatars.com/api/?name=Reviewer+${rev}&background=f4d9c6&color=9a7d6a`}
                    className="w-full h-full"
                    alt=""
                  />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    Hannah Jenkins
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                    Dec 2024
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium leading-relaxed italic">
                "A truly formal and premium experience. The attention to detail and professional staff made our stay unforgettable."
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAmenities = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
        {amenities.map((group: AmenityGroup, groupIndex) => (
          <div key={`group-${groupIndex}`}>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">
              {group.group}
            </h3>
            <div className="grid grid-cols-2 gap-y-4">
              {group.items.map((amenity: string, amenityIndex) => (
                <div 
                  key={`amenity-${groupIndex}-${amenityIndex}`} 
                  className="flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 bg-[#33a8da] rounded-full"></div>
                  <span className="text-sm font-bold text-gray-700">
                    {amenity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm">
        {policies.map((policy, i) => (
          <div
            key={policy.label}
            className={`flex flex-col md:flex-row p-6 ${
              i !== policies.length - 1 ? "border-b border-gray-50" : ""
            }`}
          >
            <div className="w-full md:w-56 shrink-0 mb-2 md:mb-0">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {policy.label}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700 leading-relaxed">
                {policy.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActiveContent = () => {
    switch (activeTab) {
      case "Overview":
        return renderOverview();
      case "Available Rooms":
        return renderRooms();
      case "Guest Reviews":
        return renderReviews();
      case "Amenities":
        return renderAmenities();
      case "Policies":
        return renderPolicies();
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-gray-600">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (error && !hotelData && !item) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Unable to load hotel details</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchHotelDetails}
            className="bg-[#33a8da] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2c98c7] transition"
          >
            Try Again
          </button>
          <button
            onClick={onBack}
            className="ml-4 px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10">
            <button onClick={onBack} className="hover:text-gray-900 transition">
              Home
            </button>
            <span className="text-gray-200">/</span>
            <span className="hover:text-gray-900 cursor-pointer">
              Hotel Search
            </span>
            <span className="text-gray-200">/</span>
            <span className="text-[#33a8da]">Property Details</span>
          </nav>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
                {hotel.name || hotel.title || "Premium Hotel"}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[#33a8da]">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                  <span className="text-xs font-bold text-gray-500">
                    {hotel.subtitle || hotel.address?.cityName || hotel.realData?.location || "City"}
                  </span>
                </div>
                <button className="text-[10px] font-black text-[#33a8da] uppercase tracking-widest hover:underline">
                  Show on map
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-100 rounded-xl text-[10px] font-black text-gray-500 hover:bg-gray-50 transition uppercase tracking-widest shadow-sm">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Share
              </button>
              <button className="w-11 h-11 rounded-xl border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition shadow-sm">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <div className="bg-[#33a8da] text-white font-black px-4 py-2.5 rounded-xl text-lg tracking-tighter shadow-lg shadow-blue-500/20">
                {hotel.rating || "4.9"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-16">
            <div
              className="lg:col-span-8 h-[400px] lg:h-[600px] rounded-[32px] overflow-hidden shadow-lg cursor-pointer group relative"
              onClick={() => openGallery(0)}
            >
              <img
                src={images[0]}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                alt="Property main view"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3">
                  <svg
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
              {images.slice(1, 4).map((img, i) => (
                <div
                  key={i}
                  className="rounded-[24px] overflow-hidden h-[190px] lg:h-auto shadow-sm cursor-pointer group relative"
                  onClick={() => openGallery(i + 1)}
                >
                  <img
                    src={img}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={`Property gallery ${i + 1}`}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300"></div>
                </div>
              ))}

              <div
                className="relative rounded-[24px] overflow-hidden h-[190px] lg:h-auto shadow-sm cursor-pointer group"
                onClick={() => openGallery(4)}
              >
                <img
                  src={images[4]}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt="Property gallery 5"
                />

                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300"></div>

                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="text-center">
                    <div className="bg-white rounded-full p-3 inline-flex items-center justify-center mb-3 shadow-lg">
                      <svg
                        className="w-6 h-6 text-[#33a8da]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                      </svg>
                    </div>
                    <p className="text-white font-bold text-sm mb-1">
                      View All Photos
                    </p>
                    <p className="text-white/80 text-xs">
                      {images.length} images
                    </p>
                  </div>
                </div>

                <div
                  className="absolute inset-0"
                  onClick={() => openGallery(4)}
                ></div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 mb-12 flex gap-10 overflow-x-auto hide-scrollbar sticky top-20 bg-white z-10 pt-4">
            {[
              "Overview",
              "Available Rooms",
              "Guest Reviews",
              "Amenities",
              "Policies",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-5 text-[10px] font-black uppercase tracking-widest transition relative shrink-0 ${
                  activeTab === tab
                    ? "text-[#33a8da]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#33a8da] rounded-full animate-in fade-in duration-300" />
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-12 mb-24">
            <div className="flex-1 min-w-0">{renderActiveContent()}</div>

            <aside className="w-full lg:w-[380px] shrink-0">
              <div className="sticky top-44 space-y-8">
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/40 border-t-4 border-t-[#33a8da]">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">
                        Starting at
                      </p>
                      <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                        {roomOptions[0]?.currency || "USD"} {roomOptions[0]?.price?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">
                        Special Deal
                      </p>
                      <p className="text-xs font-black text-green-600 uppercase tracking-tighter">
                        Save 15% Today
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        Selected Dates
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {searchParams?.checkInDate || hotel.realData?.checkInDate || "Dec 26"} - {searchParams?.checkOutDate || hotel.realData?.checkOutDate || "Dec 30"}
                      </span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        Guests
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {roomOptions[0]?.guests || 1} Adult(s)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onBook(roomOptions[0])}
                    className="w-full bg-[#33a8da] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#2c98c7] transition active:scale-95 text-base uppercase tracking-widest"
                  >
                    Confirm & Book Now
                  </button>
                  <p className="text-[9px] text-gray-400 font-bold text-center mt-6 uppercase tracking-widest leading-relaxed">
                    No Hidden Fees • Instant Confirmation
                  </p>
                </div>

                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm relative overflow-hidden group cursor-pointer">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#33a8da] group-hover:scale-110 transition">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">
                      Prime Location
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 font-medium mb-5">
                    Ideally positioned within the heart of the business and cultural district.
                  </p>
                  <button className="text-[10px] font-black text-[#33a8da] uppercase tracking-widest border-b-2 border-transparent hover:border-[#33a8da] transition">
                    View Location Details
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <div className="pt-24 border-t border-gray-100">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
                  Similar Hotels
                </h2>
                <p className="text-sm font-bold text-gray-400 mt-2">
                  Curated luxury accommodations for your stay
                </p>
              </div>
              <button className="text-[11px] font-black text-[#33a8da] uppercase tracking-widest hover:underline">
                See More Deals
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Luxury Suite Colosseum",
                  location: "Rome, Italy",
                  price: "150",
                  image:
                    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
                },
                {
                  name: "Grand Plaza Hotel",
                  location: "Milan, Italy",
                  price: "185",
                  image:
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
                },
                {
                  name: "Park Hyatt Paris",
                  location: "Paris, France",
                  price: "210",
                  image:
                    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&q=80&w=600",
                },
              ].map((prop, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="h-64 rounded-[28px] overflow-hidden mb-5 relative shadow-md">
                    <img
                      src={prop.image}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                      alt=""
                    />
                    <div className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition shadow-sm">
                      <svg
                        className="w-4.5 h-4.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight group-hover:text-[#33a8da] transition">
                    {prop.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1.5 mb-3">
                    {prop.location}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, j) => (
                        <svg
                          key={j}
                          className="w-3 h-3 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-base font-black text-gray-900 tracking-tighter">
                      ${prop.price}
                      <span className="text-[10px] text-gray-400 font-bold lowercase ml-1.5">
                        /night
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
          <button
            onClick={closeGallery}
            className="absolute top-6 right-6 z-10 text-white hover:text-gray-300 transition-colors"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="flex-1 flex items-center justify-center p-4 relative">
            <button
              onClick={goToPrevImage}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all duration-300"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="max-w-6xl mx-auto">
              <img
                src={images[currentImageIndex]}
                className="max-h-[80vh] w-auto rounded-lg shadow-2xl"
                alt={`Hotel image ${currentImageIndex + 1}`}
              />
            </div>

            <button
              onClick={goToNextImage}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-all duration-300"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>

          <div className="h-32 bg-black/50 border-t border-white/10">
            <div className="max-w-6xl mx-auto h-full px-4">
              <div className="flex items-center h-full gap-4 overflow-x-auto pb-4">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                      index === currentImageIndex
                        ? "ring-4 ring-blue-500 scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover"
                      alt={`Thumbnail ${index + 1}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 right-6 text-white/60 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white/10 rounded">←</kbd>
                <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white/10 rounded">ESC</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HotelDetails;