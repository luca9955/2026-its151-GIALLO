package it.ficsit.canteen.model;

import java.io.Serializable;

public class OrderLine implements Serializable {
    private final String itemName;
    private final int quantity;
    private final double unitPrice;

    public OrderLine(String itemName, int quantity, double unitPrice) {
        this.itemName = itemName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
    }

    public String getItemName() {
        return itemName;
    }

    public int getQuantity() {
        return quantity;
    }

    public double getUnitPrice() {
        return unitPrice;
    }

    public double getSubtotal() {
        return quantity * unitPrice;
    }
}
