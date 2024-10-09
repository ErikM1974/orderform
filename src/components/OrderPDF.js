import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  companyInfo: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  companyDetails: {
    fontSize: 10,
    marginBottom: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  orderInfo: {
    marginBottom: 20,
  },
  orderInfoItem: {
    fontSize: 12,
    marginBottom: 5,
  },
  lineItem: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  lineItemHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lineItemDetails: {
    fontSize: 10,
    marginBottom: 3,
  },
  sizingMatrix: {
    flexDirection: 'row',
    marginTop: 5,
    marginBottom: 5,
  },
  sizeCell: {
    width: '12.5%',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: 2,
    fontSize: 8,
    textAlign: 'center',
  },
  summary: {
    marginTop: 20,
    borderTop: 1,
    paddingTop: 10,
  },
});

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

const OrderPDF = ({ lineItems, totalGarmentQuantity, totalCapQuantity, totalPrice, customerName, orderDate, orderNumber }) => {
  const subtotal = totalPrice || 0;
  const salesTax = subtotal * 0.101; // 10.1% sales tax
  const total = subtotal + salesTax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>Northwest Custom Apparel</Text>
          <Text style={styles.companyDetails}>2025 Freeman Road East, Milton, WA 98354</Text>
          <Text style={styles.companyDetails}>Phone: 253-922-5792</Text>
          <Text style={styles.companyDetails}>Website: www.nwcustomapparel.com</Text>
        </View>

        <Text style={styles.title}>Invoice</Text>

        <View style={styles.orderInfo}>
          <Text style={styles.orderInfoItem}>Customer Name: {customerName}</Text>
          <Text style={styles.orderInfoItem}>Order Date: {orderDate}</Text>
          <Text style={styles.orderInfoItem}>Order Number: {orderNumber}</Text>
        </View>
        
        {lineItems.map((item, index) => (
          <View key={index} style={styles.lineItem}>
            <Text style={styles.lineItemHeader}>{item.productTitle}</Text>
            <Text style={styles.lineItemDetails}>Style: {item.styleNo}</Text>
            <Text style={styles.lineItemDetails}>Color: {item.colorName}</Text>
            <Text style={styles.lineItemDetails}>Price per item: ${item.price.toFixed(2)}</Text>
            
            <View style={styles.sizingMatrix}>
              {SIZES.map((size) => (
                <View key={size} style={styles.sizeCell}>
                  <Text>{size}</Text>
                  <Text>{item.quantities[size] || 0}</Text>
                  <Text>${((item.productData?.sizeUpcharges?.[size] || 0) + item.price).toFixed(2)}</Text>
                </View>
              ))}
            </View>
            
            <Text style={styles.lineItemDetails}>Total Quantity: {item.totalQuantity}</Text>
            <Text style={styles.lineItemDetails}>Subtotal: ${item.subtotal.toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <Text>Total Garment Quantity: {totalGarmentQuantity}</Text>
          <Text>Total Cap Quantity: {totalCapQuantity}</Text>
          <Text>Subtotal: ${subtotal.toFixed(2)}</Text>
          <Text>Sales Tax (10.1%): ${salesTax.toFixed(2)}</Text>
          <Text style={{ fontWeight: 'bold' }}>Total: ${total.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default OrderPDF;