import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class Grade {
    String name;
    float grade;
    float weight;

    Grade(String n, float g, float w) {
        name = n;
        grade = g;
        weight = w;
    }
}

class ReportCard {
  
    ReportCard(int numGrades){
        grades = new Grade[numGrades];
    }
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int n = scanner.nextInt();
	    ReportCard reportCard = new ReportCard(n);

        for (int i = 0; i < n; i++) {
            String assignment = scanner.next();
            float grade = scanner.nextFloat();
            float weight = scanner.nextFloat();

            reportCard.grades[i] = new Grade(assignment, grade, weight);
        }

        reportCard.calculateAverageGrade();

        System.out.format("Average Grade: %.2f%n", reportCard.averageGrade);
    }
}