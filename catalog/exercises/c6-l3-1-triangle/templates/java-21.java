import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class Triangle {
    float base, height;
}


public class Main {

    public static void main(String[] args) {
		Scanner scanner = new Scanner(System.in);

	    Triangle t1 = new Triangle();
        Triangle t2 = new Triangle();

	    t1.base = scanner.nextFloat();
	    t1.height = scanner.nextFloat();

        System.out.format("Area triangle1: %.2f%n", t1.calculateArea());

        t2.base = scanner.nextFloat();
        t2.height = scanner.nextFloat();

        System.out.format("Area triangle2: %.2f%n", t2.calculateArea());
    }
}