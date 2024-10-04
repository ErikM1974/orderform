import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { FixedSizeList as List } from 'react-window';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const LARGE_SIZES = ['2XL', '3XL'];
const PAGE_SIZE = 50;

const getPriceForQuantity = (product, totalQuantity) => {
  if (totalQuantity >= 72) return parseFloat(product.Price_72_plus) || 0;
  if (totalQuantity >= 48) return parseFloat(product.Price_48_71) || 0;
  if (totalQuantity >= 24) return parseFloat(product.Price_24_47) || 0;
  if (totalQuantity >= 12) return parseFloat(product.Price_12_23) || 0;
  if (totalQuantity >= 6) return parseFloat(product.Price_6_11) || 0;
  return parseFloat(product.Price_2_5) || 0;
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

export default function EmbroideryCalculator() {
  const [productDatabase, setProductDatabase] = useState({});
  const [orders, setOrders] = useState([{
    STYLE_No: "",
    COLOR_NAME: "",
    quantities: {},
    error: null
  }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [styles, setStyles] = useState([]);
  const [colors, setColors] = useState({});
  const [page, setPage] = useState(1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/products?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!response.data || !Array.isArray(response.data.Result)) {
        throw new Error('Invalid data structure received from the server');
      }
      const products = response.data.Result;

      const formattedData = {};
      const stylesSet = new Set();
      const colorsMap = {};

      products.forEach(product => {
        if (!product.STYLE_No || !product.COLOR_NAME) return;
        const key = `${product.STYLE_No}-${product.COLOR_NAME}`;
        if (!formattedData[key]) {
          formattedData[key] = {
            PRODUCT_TITLE: product.PRODUCT_TITLE,
            STYLE_No: product.STYLE_No,
            COLOR_NAME: product.COLOR_NAME,
            sizes: {},
            ...product
          };
        }
        formattedData[key].sizes[product.SIZE] = product;

        stylesSet.add(product.STYLE_No);
        if (!colorsMap[product.STYLE_No]) {
          colorsMap[product.STYLE_No] = new Set();
        }
        colorsMap[product.STYLE_No].add(product.COLOR_NAME);
      });

      setProductDatabase(prevData => ({ ...prevData, ...formattedData }));
      setStyles(prevStyles => Array.from(new Set([...prevStyles, ...Array.from(stylesSet)])));
      setColors(prevColors => {
        const newColors = { ...prevColors };
        Object.entries(colorsMap).forEach(([style, colorSet]) => {
          if (!newColors[style]) {
            newColors[style] = [];
          }
          newColors[style] = Array.from(new Set([...newColors[style], ...Array.from(colorSet)]));
        });
        return newColors;
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching product data:', err);
      setError(`Failed to load product data: ${err.message}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addNewLine = useCallback(() => {
    setOrders(prevOrders => [...prevOrders, {
      STYLE_No: "",
      COLOR_NAME: "",
      quantities: {},
      error: null
    }]);
  }, []);

  const removeLine = useCallback((index) => {
    if (orders.length > 1) {
      setOrders(prevOrders => prevOrders.filter((_, i) => i !== index));
    }
  }, [orders.length]);

  const updateOrder = useCallback((index, field, value) => {
    setOrders(prevOrders => {
      const newOrders = [...prevOrders];
      newOrders[index] = {
        ...newOrders[index],
        [field]: value,
        error: null
      };

      if (field === 'STYLE_No') {
        newOrders[index].COLOR_NAME = '';
        newOrders[index].quantities = {};
      } else if (field === 'COLOR_NAME') {
        newOrders[index].quantities = {};
      }

      const key = `${newOrders[index].STYLE_No}-${newOrders[index].COLOR_NAME}`;
      if (newOrders[index].STYLE_No && newOrders[index].COLOR_NAME && !productDatabase[key]) {
        newOrders[index].error = "Invalid style or color combination";
      }

      return newOrders;
    });
  }, [productDatabase]);

  const updateQuantity = useCallback((orderIndex, size, value) => {
    setOrders(prevOrders => {
      const newOrders = [...prevOrders];
      const newQuantities = {
        ...newOrders[orderIndex].quantities,
        [size]: parseInt(value) || 0
      };
      newOrders[orderIndex].quantities = newQuantities;
      return newOrders;
    });
  }, []);

  const calculateOrderTotals = useMemo(() => {
    const totalQuantity = orders.reduce((acc, order) => {
      return acc + Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
    }, 0);

    return orders.reduce((acc, order) => {
      const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
      const product = productDatabase[key];
      if (!product) return acc;

      const orderQuantity = Object.values(order.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
      const basePrice = getPriceForQuantity(product, totalQuantity);

      const orderPrice = Object.entries(order.quantities).reduce((sum, [size, qty]) => {
        if (!qty) return sum;
        const sizeProduct = product.sizes[size];
        const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
        return sum + (basePrice + surcharge) * qty;
      }, 0);

      return {
        quantity: acc.quantity + orderQuantity,
        price: acc.price + orderPrice
      };
    }, { quantity: 0, price: 0 });
  }, [orders, productDatabase]);

  const handleSubmitOrder = useCallback(() => {
    console.log('Submitting order:', orders);
    alert('Order submitted successfully!');
  }, [orders]);

  const renderSizeInput = useCallback((order, size, totalQuantity, orderIndex) => {
    const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
    const product = productDatabase[key];
    const basePrice = product ? getPriceForQuantity(product, totalQuantity) : 0;
    const sizeProduct = product?.sizes[size];
    const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
    const price = basePrice + surcharge;

    return (
      <div className={`p-1 ${LARGE_SIZES.includes(size) ? 'bg-green-100' : ''}`}>
        <input
          type="number"
          value={order.quantities[size] || ''}
          onChange={(e) => updateQuantity(orderIndex, size, e.target.value)}
          className="w-full mb-1 text-sm"
          min="0"
        />
        <div className="text-xs text-gray-500">${price.toFixed(2)}</div>
      </div>
    );
  }, [productDatabase, updateQuantity]);

  const renderOrderRow = useCallback(({ index, style }) => {
    const order = orders[index];
    const otherSizes = Object.keys(productDatabase[`${order.STYLE_No}-${order.COLOR_NAME}`]?.sizes || {})
      .filter(size => !STANDARD_SIZES.includes(size));

    return (
      <div style={style} className="flex items-center">
        <div className="flex-1 p-2">
          <input
            list={`styles-${index}`}
            value={order.STYLE_No}
            onChange={(e) => updateOrder(index, 'STYLE_No', e.target.value)}
            className="w-full"
            placeholder="Enter or select style"
          />
          <datalist id={`styles-${index}`}>
            {styles.map(style => (
              <option key={style} value={style} />
            ))}
          </datalist>
        </div>
        <div className="flex-1 p-2">
          <select
            value={order.COLOR_NAME}
            onChange={(e) => updateOrder(index, 'COLOR_NAME', e.target.value)}
            className="w-full"
            disabled={!order.STYLE_No}
          >
            <option value="">Select Color</option>
            {colors[order.STYLE_No]?.map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 p-2">
          {productDatabase[`${order.STYLE_No}-${order.COLOR_NAME}`]?.PRODUCT_TITLE || ''}
        </div>
        {STANDARD_SIZES.map(size => (
          <div key={size} className="flex-1 p-2">
            {renderSizeInput(order, size, calculateOrderTotals.quantity, index)}
          </div>
        ))}
        <div className="flex-1 p-2">
          {otherSizes.map(size => (
            <div key={size} className="mb-2">
              <div className="text-xs font-bold">{size}</div>
              {renderSizeInput(order, size, calculateOrderTotals.quantity, index)}
            </div>
          ))}
        </div>
        <div className="flex-1 p-2 font-bold">
          ${(Object.entries(order.quantities).reduce((sum, [size, qty]) => {
            const key = `${order.STYLE_No}-${order.COLOR_NAME}`;
            const product = productDatabase[key];
            if (!product) return sum;
            const basePrice = getPriceForQuantity(product, calculateOrderTotals.quantity);
            const sizeProduct = product.sizes[size];
            const surcharge = sizeProduct && sizeProduct.Surcharge ? parseFloat(sizeProduct.Surcharge) || 0 : 0;
            return sum + (basePrice + surcharge) * qty;
          }, 0)).toFixed(2)}
        </div>
        <div className="flex-1 p-2">
          <button onClick={() => removeLine(index)} className="bg-red-500 text-white px-2 py-1 rounded">
            Remove
          </button>
        </div>
      </div>
    );
  }, [orders, styles, colors, productDatabase, updateOrder, renderSizeInput, calculateOrderTotals.quantity, removeLine]);

  if (loading && page === 1) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="w-full p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Embroidery Order Form</h1>
      <p className="mb-4">Number of styles available: {styles.length}</p>
      <div className="mb-4 bg-white">
        <div className="flex bg-green-600 text-white">
          <div className="flex-1 p-2">Style No</div>
          <div className="flex-1 p-2">Color Name</div>
          <div className="flex-1 p-2">Product Title</div>
          {STANDARD_SIZES.map(size => (
            <div key={size} className={`flex-1 p-2 ${LARGE_SIZES.includes(size) ? 'bg-green-700' : ''}`}>
              {size}
            </div>
          ))}
          <div className="flex-1 p-2">Other Sizes</div>
          <div className="flex-1 p-2">Row Total</div>
          <div className="flex-1 p-2">Actions</div>
        </div>
        <List
          height={400}
          itemCount={orders.length}
          itemSize={100}
          width="100%"
        >
          {renderOrderRow}
        </List>
      </div>
      {orders.some(order => order.error) && (
        <div className="text-red-500 mb-4">
          {orders.map((order, index) => order.error && (
            <div key={index}>Line {index + 1}: {order.error}</div>
          ))}
        </div>
      )}
      <div className="mb-4">
        <button onClick={addNewLine} className="bg-green-600 text-white px-4 py-2 rounded mr-2 hover:bg-green-700">
          Add Line
        </button>
        <button onClick={handleSubmitOrder} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Submit Order
        </button>
        {page * PAGE_SIZE < styles.length && (
          <button onClick={() => setPage(prevPage => prevPage + 1)} className="bg-blue-500 text-white px-4 py-2 rounded ml-2 hover:bg-blue-600">
            Load More Styles
          </button>
        )}
      </div>
      <div className="text-xl font-bold text-gray-700">
        Total Quantity: {calculateOrderTotals.quantity}
      </div>
      <div className="text-xl font-bold text-gray-700">
        Total Price: ${calculateOrderTotals.price.toFixed(2)}
      </div>
    </div>
  );
}
