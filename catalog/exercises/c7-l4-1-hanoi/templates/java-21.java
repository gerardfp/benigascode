import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

public class Main {
  
    static String[] src;
    static String[] aux;
    static String[] dst;
  
    static void solve(int n, String[] src, String[] aux, String[] dst){
      
      // escriu aqui la solucio
      
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        src = new String[n];
        aux = new String[n];
        dst = new String[n];

        for (int i = 0; i < n; i++) {
            int nd = (n*2-((i+1)*2-1));
            src[i] = String.format("%"+nd+"s", "").replace(" ", "#");
            aux[i] = "";
            dst[i] = "";
        }
        print();
        solve(n, src, aux, dst);
    }
  

  
    static void move(String[] from, String[] to){
        String disc = "";
        for (int i = from.length-1; i >= 0  ; i--) {
            if(!from[i].equals("")){
                disc = from[i];
                from[i] = "";
                break;
            }
        }

        for (int i = 0; i < to.length ; i++) {
            if(to[i].equals("")){
                to[i] = disc;
                break;
            }
        }
    }
  
  	static void print(){
        for (int i = dst.length-1; i >= 0 ; i--) {
            String s = src[i].equals("") ? "|" : src[i];
            String a = aux[i].equals("") ? "|" : aux[i];
            String d = dst[i].equals("") ? "|" : dst[i];
            int ss = (dst.length*2-s.length()+1)/2;
            int sa = (dst.length*2-a.length()+1)/2;
            int sd = (dst.length*2-d.length()+1)/2;
            int h = 1;
            System.out.format("%1$"+ss+"s%2$"+h+"s%1$"+ss+"s"  + "%1$"+sa+"s%3$"+h+"s%1$"+sa+"s" +  "%1$"+sd+"s%4$"+h+"s%1$"+sd+"s" + "%n", "",
                    s,a,d);
        }
        System.out.printf(String.format("%"+(dst.length*2*3+3)+"s%n", "").replace(" ","-"));
    }
}