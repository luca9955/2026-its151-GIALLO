package it.ficsit.canteen.model;

import java.io.Serializable;

public class Reservation implements Serializable {
    private final String id;
    private final String firstName;
    private final String lastName;
    private final String phone;
    private final String email;
    private final int people;
    private final String date;
    private final String time;
    private final int tableId;
    private String status;

    public Reservation(String id, String firstName, String lastName, String phone, String email, int people, String date, String time, int tableId) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.email = email;
        this.people = people;
        this.date = date;
        this.time = time;
        this.tableId = tableId;
        this.status = "In attesa";
    }

    public String getId() {
        return id;
    }

    public String getCustomerName() {
        return firstName + " " + lastName;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public int getPeople() {
        return people;
    }

    public String getDate() {
        return date;
    }

    public String getTime() {
        return time;
    }

    public int getTableId() {
        return tableId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
